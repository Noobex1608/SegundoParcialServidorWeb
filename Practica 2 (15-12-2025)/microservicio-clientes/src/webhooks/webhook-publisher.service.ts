import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WebhookSecurityService, WebhookPayload } from './webhook-security.service';
import { CircuitBreakerService, CircuitState } from './circuit-breaker.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Suscripción de webhook desde Supabase.
 */
interface WebhookSubscription {
  id: number;
  event_type: string;
  url: string;
  secret: string;
  is_active: boolean;
  retry_config: {
    max_attempts: number;
    backoff_type: string;
    initial_delay_ms: number;
    delays_ms: number[];
  };
}

/**
 * Resultado de la entrega de un webhook.
 */
interface DeliveryResult {
  subscription_id: number;
  url: string;
  success: boolean;
  status_code?: number;
  error_message?: string;
  attempts: number;
  duration_ms: number;
  circuit_breaker_state?: string;
}

/**
 * Servicio principal para publicar webhooks.
 * 
 * Responsabilidades:
 * - Obtener suscripciones de Supabase
 * - Verificar Circuit Breaker antes de enviar
 * - Firmar payload con HMAC
 * - Enviar webhook con retry y exponential backoff
 * - Registrar resultados en webhook_deliveries
 */
@Injectable()
export class WebhookPublisherService {
  private readonly logger = new Logger(WebhookPublisherService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly httpService: HttpService,
    private readonly securityService: WebhookSecurityService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    // Inicializar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('⚠️ Supabase no configurado. Las suscripciones de webhook no funcionarán.');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Publica un evento de webhook a todos los suscriptores.
   * @param eventType Tipo de evento (ej: "reserva.creada")
   * @param data Datos del evento
   * @param source Origen del evento (ej: "microservice-reservas")
   */
  async publishEvent(eventType: string, data: any, source: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`📤 Publicando evento: ${eventType}`);
      
      // 1. Construir payload del webhook
      const payload = this.securityService.buildWebhookPayload(eventType, data, source);
      
      // 2. Obtener suscriptores activos para este tipo de evento
      const subscriptions = await this.getSubscriptions(eventType);
      
      if (!subscriptions || subscriptions.length === 0) {
        this.logger.warn(`⚠️ No hay suscriptores para el evento: ${eventType}`);
        return;
      }
      
      this.logger.log(`📋 Encontrados ${subscriptions.length} suscriptores para ${eventType}`);
      
      // 3. Enviar a cada suscriptor (en paralelo)
      const deliveryPromises = subscriptions.map(subscription =>
        this.deliverWebhook(subscription, payload)
      );
      
      const results = await Promise.allSettled(deliveryPromises);
      
      // 4. Registrar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Evento ${eventType} publicado: ${successful} exitosos, ${failed} fallidos (${duration}ms)`
      );
      
    } catch (error) {
      this.logger.error(`❌ Error publicando evento ${eventType}:`, error.message);
      throw error;
    }
  }

  /**
   * Entrega un webhook a un suscriptor específico con retry.
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const maxAttempts = subscription.retry_config.max_attempts || 6;
    const delays = subscription.retry_config.delays_ms || [60000, 300000, 1800000, 7200000, 43200000];
    
    let lastError: string = '';
    let lastStatusCode: number | undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 1. Verificar Circuit Breaker
        const canExecute = await this.circuitBreaker.canExecute(subscription.url);
        const circuitState = await this.circuitBreaker.getStateString(subscription.url);
        
        if (!canExecute) {
          this.logger.warn(
            `🔴 Circuit breaker OPEN para ${subscription.url}, saltando intento ${attempt}/${maxAttempts}`
          );
          
          // Registrar intento bloqueado por circuit breaker
          await this.recordDelivery(
            subscription.id,
            payload.id,
            payload.event,
            attempt,
            false,
            0,
            'Circuit breaker OPEN',
            Date.now() - startTime,
            circuitState
          );
          
          // Si es el último intento, lanzar error
          if (attempt === maxAttempts) {
            throw new Error('Circuit breaker OPEN, máximo de intentos alcanzado');
          }
          
          // Esperar antes del siguiente intento
          if (attempt < maxAttempts) {
            const delay = delays[attempt - 1] || delays[delays.length - 1];
            await this.sleep(delay);
          }
          
          continue;
        }
        
        // 2. Serializar payload UNA SOLA VEZ (para garantizar consistencia de firma)
        const payloadString = JSON.stringify(payload);
        
        // DEBUG: Mostrar información de firma
        this.logger.debug(`🔐 === DEBUG FIRMA ===`);
        this.logger.debug(`   Payload length: ${payloadString.length} caracteres`);
        this.logger.debug(`   Payload primeros 100 chars: ${payloadString.substring(0, 100)}...`);
        this.logger.debug(`   Secret completo: "${subscription.secret}"`);
        this.logger.debug(`   Secret length: ${subscription.secret.length}`);
        
        // 3. Generar firma HMAC usando el string serializado
        const signature = this.securityService.generateSignatureFromString(payloadString, subscription.secret);
        const timestamp = this.securityService.generateTimestamp();
        
        this.logger.debug(`   Firma generada: ${signature}`);
        
        // 4. Enviar webhook con el MISMO string que se usó para firmar
        this.logger.log(
          `📤 Enviando webhook a ${subscription.url} (intento ${attempt}/${maxAttempts})`
        );
        
        const response = await firstValueFrom(
          this.httpService.post(subscription.url, payloadString, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': timestamp,
              'X-Webhook-Event': payload.event,
              'X-Webhook-ID': payload.id,
            },
            timeout: 30000, // 30 segundos
          })
        );
        
        // 4. Éxito
        const duration = Date.now() - startTime;
        this.logger.log(
          `✅ Webhook entregado exitosamente a ${subscription.url} (${response.status}, ${duration}ms)`
        );
        
        // Registrar éxito en circuit breaker
        await this.circuitBreaker.recordSuccess(subscription.url);
        
        // Registrar entrega exitosa
        await this.recordDelivery(
          subscription.id,
          payload.id,
          payload.event,
          attempt,
          true,
          response.status,
          null,
          duration,
          circuitState
        );
        
        return {
          subscription_id: subscription.id,
          url: subscription.url,
          success: true,
          status_code: response.status,
          attempts: attempt,
          duration_ms: duration,
          circuit_breaker_state: circuitState,
        };
        
      } catch (error) {
        lastError = error.message || 'Error desconocido';
        lastStatusCode = error.response?.status;
        
        this.logger.error(
          `❌ Intento ${attempt}/${maxAttempts} falló para ${subscription.url}: ${lastError}`
        );
        
        // Registrar fallo en circuit breaker
        await this.circuitBreaker.recordFailure(subscription.url);
        
        const circuitState = await this.circuitBreaker.getStateString(subscription.url);
        
        // Registrar intento fallido
        await this.recordDelivery(
          subscription.id,
          payload.id,
          payload.event,
          attempt,
          false,
          lastStatusCode,
          lastError,
          Date.now() - startTime,
          circuitState
        );
        
        // Si no es el último intento, esperar con exponential backoff
        if (attempt < maxAttempts) {
          const delay = delays[attempt - 1] || delays[delays.length - 1];
          this.logger.log(`⏳ Esperando ${delay / 1000}s antes del siguiente intento...`);
          await this.sleep(delay);
        }
      }
    }
    
    // Todos los intentos fallaron
    const duration = Date.now() - startTime;
    this.logger.error(
      `💀 Todos los intentos fallaron para ${subscription.url} después de ${maxAttempts} intentos`
    );
    
    return {
      subscription_id: subscription.id,
      url: subscription.url,
      success: false,
      status_code: lastStatusCode,
      error_message: lastError,
      attempts: maxAttempts,
      duration_ms: duration,
    };
  }

  /**
   * Obtiene las suscripciones activas para un tipo de evento desde Supabase.
   */
  private async getSubscriptions(eventType: string): Promise<WebhookSubscription[]> {
    try {
      const { data, error } = await this.supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_active', true);
      
      if (error) {
        this.logger.error(`Error obteniendo suscripciones de Supabase:`, error);
        return [];
      }
      
      return data as WebhookSubscription[];
    } catch (error) {
      this.logger.error(`Error conectando con Supabase:`, error.message);
      return [];
    }
  }

  /**
   * Registra el resultado de una entrega en Supabase.
   */
  private async recordDelivery(
    subscriptionId: number,
    eventId: string,
    eventType: string,
    attemptNumber: number,
    success: boolean,
    statusCode: number | undefined,
    errorMessage: string | null,
    durationMs: number,
    circuitBreakerState?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('webhook_deliveries')
        .insert({
          subscription_id: subscriptionId,
          event_id: eventId,
          event_type: eventType,
          attempt_number: attemptNumber,
          status_code: statusCode,
          status: success ? 'success' : (circuitBreakerState === CircuitState.OPEN ? 'circuit_open' : 'failed'),
          error_message: errorMessage,
          duration_ms: durationMs,
          delivered_at: new Date().toISOString(),
          circuit_breaker_state: circuitBreakerState,
        });
    } catch (error) {
      this.logger.error(`Error registrando entrega en Supabase:`, error.message);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Función auxiliar para esperar (sleep).
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

