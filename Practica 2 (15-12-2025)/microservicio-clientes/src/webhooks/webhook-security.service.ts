import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Servicio de seguridad para webhooks.
 * Genera firmas HMAC-SHA256 y timestamps para webhooks seguros.
 */
@Injectable()
export class WebhookSecurityService {
  /**
   * Genera una firma HMAC-SHA256 para el payload del webhook.
   * @param payload Objeto a firmar
   * @param secret Secret compartido para la firma
   * @returns Firma en formato "sha256=abc123..."
   */
  generateSignature(payload: any, secret: string): string {
    // 1. Serializar payload a JSON string (sin espacios para consistencia)
    const payloadString = JSON.stringify(payload);
    
    // 2. Crear HMAC con SHA256
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    // 3. Retornar con prefijo estándar (compatible con GitHub, Stripe, etc.)
    return `sha256=${hmac}`;
  }

  /**
   * Genera una firma HMAC-SHA256 desde un string ya serializado.
   * Esto garantiza que la firma se genere del MISMO string que se enviará.
   * @param payloadString String JSON ya serializado
   * @param secret Secret compartido para la firma
   * @returns Firma en formato "sha256=abc123..."
   */
  generateSignatureFromString(payloadString: string, secret: string): string {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return `sha256=${hmac}`;
  }

  /**
   * Genera un timestamp Unix (en segundos).
   * Usado para validación anti-replay en el receptor.
   * @returns Timestamp en segundos
   */
  generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * Construye el payload estándar del webhook según especificación del taller.
   * @param event Tipo de evento (ej: "cliente.creado")
   * @param data Datos del evento
   * @param source Origen del evento (ej: "microservice-clientes")
   * @returns Payload formateado
   */
  buildWebhookPayload(event: string, data: any, source: string): WebhookPayload {
    return {
      event,
      version: '1.0',
      id: crypto.randomUUID(),
      idempotency_key: `${event}-${data.id || crypto.randomUUID()}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source,
        environment: process.env.NODE_ENV || 'development',
        correlation_id: crypto.randomUUID(),
      },
    };
  }
}

/**
 * Interfaz del payload estándar de webhook.
 */
export interface WebhookPayload {
  event: string;
  version: string;
  id: string;
  idempotency_key: string;
  timestamp: string;
  data: any;
  metadata: {
    source: string;
    environment: string;
    correlation_id: string;
  };
}

