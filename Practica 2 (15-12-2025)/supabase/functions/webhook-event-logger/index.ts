/**
 * Edge Function 1: Webhook Event Logger
 * 
 * Responsabilidades:
 * - Validar firma HMAC-SHA256 del webhook
 * - Verificar timestamp (anti-replay attack, máximo 5 minutos)
 * - Verificar idempotencia (deduplicar eventos duplicados)
 * - Guardar evento completo en tabla webhook_events
 * - Retornar 200 OK con event_id generado
 * 
 * Variables de entorno requeridas:
 * - WEBHOOK_SECRET: Secret compartido para verificar firma HMAC
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Variables de entorno
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Interfaces
interface WebhookPayload {
  event: string;
  version: string;
  id: string;
  idempotency_key: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata: {
    source: string;
    environment: string;
    correlation_id: string;
  };
}

/**
 * Valida la firma HMAC-SHA256 del webhook.
 */
async function validateSignature(
  body: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; expectedHash: string; receivedHash: string }> {
  try {
    // Extraer hash de la firma (formato: "sha256=abc123...")
    const receivedHash = signature.replace('sha256=', '');
    
    // Calcular hash esperado usando Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    // Importar clave para HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Generar firma
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      messageData
    );
    
    // Convertir a hexadecimal
    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // DEBUG: Mostrar información de comparación
    console.log('🔐 === DEBUG FIRMA ===');
    console.log(`   Body length: ${body.length} caracteres`);
    console.log(`   Body primeros 100 chars: ${body.substring(0, 100)}...`);
    console.log(`   Secret completo: "${secret}"`);
    console.log(`   Secret length: ${secret.length}`);
    console.log(`   Firma RECIBIDA:  ${receivedHash}`);
    console.log(`   Firma ESPERADA:  ${expectedHash}`);
    console.log(`   ¿Coinciden?: ${receivedHash === expectedHash}`);
    
    // Comparación segura
    const valid = timingSafeEqual(receivedHash, expectedHash);
    return { valid, expectedHash, receivedHash };
  } catch (error) {
    console.error('Error validando firma:', error);
    return { valid: false, expectedHash: '', receivedHash: '' };
  }
}

/**
 * Comparación de strings en tiempo constante para prevenir timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Valida que el timestamp no sea muy antiguo (anti-replay attack).
 * @param timestamp Timestamp Unix en segundos
 * @param maxAgeMinutes Edad máxima permitida en minutos (default: 5)
 */
function validateTimestamp(timestamp: string, maxAgeMinutes: number = 5): boolean {
  try {
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    const age = now - requestTime;
    
    // Verificar que no sea muy antiguo (anti-replay)
    if (age > maxAgeMinutes * 60) {
      console.warn(`⚠️ Timestamp muy antiguo: ${age} segundos`);
      return false;
    }
    
    // Verificar que no sea del futuro (clock skew)
    if (age < -60) {
      console.warn(`⚠️ Timestamp del futuro: ${age} segundos`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validando timestamp:', error);
    return false;
  }
}

/**
 * Verifica si un webhook ya fue procesado (idempotencia).
 */
async function yaFueProcesado(
  supabase: ReturnType<typeof createClient>,
  idempotencyKey: string
): Promise<{ procesado: boolean; resultado?: unknown }> {
  const { data, error } = await supabase
    .from('processed_webhooks')
    .select('id, result, processed_at')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error verificando idempotencia:', error);
    return { procesado: false };
  }
  
  if (data) {
    console.log(`🔁 Webhook duplicado detectado: ${idempotencyKey}`);
    return { procesado: true, resultado: data.result };
  }
  
  return { procesado: false };
}

/**
 * Guarda el webhook en la base de datos.
 */
async function guardarWebhook(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload
): Promise<{ id: number; event_id: string }> {
  // 1. Guardar en webhook_events
  const { data: event, error: errorEvent } = await supabase
    .from('webhook_events')
    .insert({
      event_id: payload.id,
      event_type: payload.event,
      idempotency_key: payload.idempotency_key,
      payload: payload,
      metadata: payload.metadata,
      source: payload.metadata.source,
      version: payload.version,
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    })
    .select('id, event_id')
    .single();
  
  if (errorEvent) {
    console.error('Error guardando evento:', errorEvent);
    throw new Error(`Error guardando evento: ${errorEvent.message}`);
  }
  
  // 2. Marcar como procesado en processed_webhooks
  const { error: errorProcessed } = await supabase
    .from('processed_webhooks')
    .insert({
      idempotency_key: payload.idempotency_key,
      event_id: payload.id,
      event_type: payload.event,
      processed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      result: { success: true, event_id: event.event_id }
    });
  
  if (errorProcessed) {
    console.error('Error marcando como procesado:', errorProcessed);
    // No lanzar error aquí, el evento ya se guardó
  }
  
  return event;
}

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Método no permitido. Usa POST.'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verificar configuración
    if (!WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Configuración incompleta');
      return new Response(JSON.stringify({
        error: 'Configuración del servidor incompleta'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Obtener headers
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    
    if (!signature || !timestamp) {
      console.warn('⚠️ Headers faltantes');
      return new Response(JSON.stringify({
        error: 'Headers requeridos faltantes: x-webhook-signature, x-webhook-timestamp'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Leer body
    const bodyText = await req.text();
    let payload: WebhookPayload;
    
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      console.error('❌ JSON inválido:', error);
      return new Response(JSON.stringify({
        error: 'Body JSON inválido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📨 Webhook recibido: ${payload.event} (${payload.id})`);
    console.log(`🔍 Signature recibida: ${signature.substring(0, 20)}...`);
    console.log(`🔍 Timestamp: ${timestamp}`);
    console.log(`🔍 WEBHOOK_SECRET configurado: ${WEBHOOK_SECRET ? 'SÍ' : 'NO'}`);
    console.log(`🔍 Longitud del secret: ${WEBHOOK_SECRET.length} caracteres`);
    
    // 1. VALIDAR TIMESTAMP (Anti-replay attack)
    if (!validateTimestamp(timestamp, 5)) {
      console.error('❌ Timestamp inválido o expirado');
      return new Response(JSON.stringify({
        error: 'Timestamp inválido o expirado (máximo 5 minutos)'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Timestamp válido');
    
    // 2. VALIDAR FIRMA HMAC
    const { valid: firmaValida, expectedHash, receivedHash } = await validateSignature(bodyText, signature, WEBHOOK_SECRET);
    
    if (!firmaValida) {
      console.error('❌ Firma HMAC inválida');
      console.error(`   Firma recibida: ${signature}`);
      console.error(`   Secret usado: ${WEBHOOK_SECRET.substring(0, 10)}...`);
      console.error(`   Hash recibido: ${receivedHash}`);
      console.error(`   Hash esperado: ${expectedHash}`);
      return new Response(JSON.stringify({
        error: 'Firma HMAC inválida',
        debug: {
          received: receivedHash.substring(0, 16) + '...',
          expected: expectedHash.substring(0, 16) + '...'
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Firma HMAC válida');
    
    // 3. VERIFICAR IDEMPOTENCIA
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { procesado, resultado } = await yaFueProcesado(supabase, payload.idempotency_key);
    
    if (procesado) {
      console.log('🔁 Webhook duplicado, retornando resultado cacheado');
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook ya fue procesado (duplicado)',
        duplicate: true,
        cached_result: resultado
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 4. GUARDAR WEBHOOK EN BASE DE DATOS
    const event = await guardarWebhook(supabase, payload);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Webhook guardado: ${event.event_id} (${duration}ms)`);
    
    // 5. RETORNAR RESPUESTA EXITOSA
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook procesado exitosamente',
      event_id: event.event_id,
      idempotency_key: payload.idempotency_key,
      event_type: payload.event,
      processed_at: new Date().toISOString(),
      duration_ms: duration
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    
    return new Response(JSON.stringify({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

