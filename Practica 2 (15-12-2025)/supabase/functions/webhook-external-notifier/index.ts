/**
 * Edge Function 2: Webhook External Notifier
 * 
 * Responsabilidades:
 * - Validar firma HMAC del webhook
 * - Verificar idempotencia
 * - Enviar notificaciones por Email sobre eventos de negocio
 * - Registrar resultado de notificación en webhook_deliveries
 * - Retornar 200 OK o 500 para retry
 * 
 * Variables de entorno requeridas:
 * - WEBHOOK_SECRET: Secret compartido
 * - SMTP_HOST: smtp.gmail.com
 * - SMTP_PORT: 587
 * - SMTP_USER: tu email
 * - SMTP_PASS: contraseña de aplicación
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// Variables de entorno
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USER = Deno.env.get('SMTP_USER') || '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'Sistema de Reservas';

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
    const receivedHash = signature.replace('sha256=', '');
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // DEBUG: Mostrar información de comparación
    console.log('🔐 === DEBUG FIRMA ===');
    console.log(`   Secret completo: "${secret}"`);
    console.log(`   Secret length: ${secret.length}`);
    console.log(`   Firma RECIBIDA:  ${receivedHash}`);
    console.log(`   Firma ESPERADA:  ${expectedHash}`);
    console.log(`   ¿Coinciden?: ${receivedHash === expectedHash}`);
    
    const valid = timingSafeEqual(receivedHash, expectedHash);
    return { valid, expectedHash, receivedHash };
  } catch (error) {
    console.error('Error validando firma:', error);
    return { valid: false, expectedHash: '', receivedHash: '' };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifica si un webhook ya fue procesado.
 */
async function yaFueProcesado(
  supabase: ReturnType<typeof createClient>,
  idempotencyKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('processed_webhooks')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  return !!data;
}

/**
 * Genera el HTML del email según el tipo de evento.
 */
function generarEmailHTML(evento: string, data: Record<string, unknown>): string {
  const fecha = new Date().toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let contenido = '';
  let asunto = '';
  let emoji = '📢';
  
  switch (evento) {
    case 'reserva.creada':
      emoji = '✅';
      asunto = 'Nueva Reserva Creada';
      contenido = `
        <h2 style="color: #28a745;">✅ Nueva Reserva Creada</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>ID de Reserva:</strong> ${data.id || 'N/A'}</p>
          <p><strong>Cliente ID:</strong> ${data.clienteId || 'N/A'}</p>
          <p><strong>Servicio:</strong> ${data.servicioNombre || 'N/A'}</p>
          <p><strong>Fecha de Reserva:</strong> ${data.fechaReserva || 'N/A'}</p>
          <p><strong>Duración:</strong> ${data.duracionMinutos || 'N/A'} minutos</p>
          <p><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">${data.estado || 'N/A'}</span></p>
          ${data.notas ? `<p><strong>Notas:</strong> ${data.notas}</p>` : ''}
        </div>
      `;
      break;
      
    case 'reserva.cancelada':
      emoji = '❌';
      asunto = 'Reserva Cancelada';
      contenido = `
        <h2 style="color: #dc3545;">❌ Reserva Cancelada</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>ID de Reserva:</strong> ${data.id || 'N/A'}</p>
          <p><strong>Cliente ID:</strong> ${data.clienteId || 'N/A'}</p>
          <p><strong>Servicio:</strong> ${data.servicioNombre || 'N/A'}</p>
          <p><strong>Fecha de Cancelación:</strong> ${data.fechaCancelacion || 'N/A'}</p>
          <p><strong>Estado:</strong> <span style="color: #dc3545; font-weight: bold;">${data.estado || 'N/A'}</span></p>
        </div>
      `;
      break;
      
    case 'cliente.creado':
      emoji = '👤';
      asunto = 'Nuevo Cliente Registrado';
      contenido = `
        <h2 style="color: #007bff;">👤 Nuevo Cliente Registrado</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>ID de Cliente:</strong> ${data.id || 'N/A'}</p>
          <p><strong>Nombre:</strong> ${data.nombre || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
          <p><strong>Teléfono:</strong> ${data.telefono || 'N/A'}</p>
          <p><strong>Estado:</strong> <span style="color: ${data.activo ? '#28a745' : '#dc3545'}; font-weight: bold;">${data.activo ? 'Activo' : 'Inactivo'}</span></p>
        </div>
      `;
      break;
      
    default:
      emoji = '📢';
      asunto = `Evento: ${evento}`;
      contenido = `
        <h2>${emoji} Evento del Sistema</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Tipo de Evento:</strong> ${evento}</p>
          <pre style="background: #e9ecef; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
        </div>
      `;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${asunto}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} ${asunto}</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          ${contenido}
          
          <div style="border-top: 2px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 5px 0;">
              <strong>Fecha del evento:</strong> ${fecha}
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 5px 0;">
              <strong>Sistema:</strong> Microservicios con Webhooks
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            Este correo fue enviado automáticamente por el sistema de webhooks.
          </p>
          <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
            Sistema de Notificaciones - Taller 2 Microservicios
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envía un email usando SMTP.
 * Gmail: Puerto 465 = SSL directo (más compatible)
 *        Puerto 587 = STARTTLS (puede dar problemas)
 * 
 * @param destinatario - Email del destinatario (cliente)
 * @param asunto - Asunto del correo
 * @param cuerpoHtml - Contenido HTML del correo
 */
async function enviarEmailSMTP(
  destinatario: string,
  asunto: string,
  cuerpoHtml: string
): Promise<{ exito: boolean; messageId?: string; error?: string }> {
  
  // Usar puerto 465 con SSL directo (más compatible con Gmail)
  const smtpPort = SMTP_PORT === 587 ? 465 : SMTP_PORT;
  
  console.log(`📤 Conectando a SMTP: ${SMTP_HOST}:${smtpPort}`);
  console.log(`📧 Destinatario: ${destinatario}`);
  
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: smtpPort,
      tls: true,  // SSL directo para puerto 465
      auth: {
        username: SMTP_USER,
        password: SMTP_PASS,
      },
    },
  });

  try {
    await client.send({
      from: `${EMAIL_FROM_NAME} <${SMTP_USER}>`,
      to: destinatario, // ✅ Enviar al email del cliente
      subject: asunto,
      content: "Por favor usa un cliente de correo compatible con HTML",
      html: cuerpoHtml,
    });

    await client.close();
    console.log(`✅ Email enviado correctamente a ${destinatario}`);
    
    return { 
      exito: true, 
      messageId: `smtp-${Date.now()}` 
    };
  } catch (error) {
    console.error('❌ Error SMTP detallado:', error);
    try {
      await client.close();
    } catch (closeError) {
      // Ignorar error al cerrar
    }
    return { 
      exito: false, 
      error: error.message 
    };
  }
}

/**
 * Registra el resultado de la entrega en webhook_deliveries.
 */
async function registrarEntrega(
  supabase: ReturnType<typeof createClient>,
  payload: WebhookPayload,
  exito: boolean,
  error?: string
): Promise<void> {
  await supabase
    .from('webhook_deliveries')
    .insert({
      event_id: payload.id,
      event_type: payload.event,
      attempt_number: 1,
      status_code: exito ? 200 : 500,
      status: exito ? 'success' : 'failed',
      error_message: error,
      delivered_at: new Date().toISOString()
    });
}

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verificar configuración
    if (!SMTP_USER || !SMTP_PASS || !WEBHOOK_SECRET) {
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
    
    if (!signature) {
      return new Response(JSON.stringify({
        error: 'Header x-webhook-signature requerido'
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
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📨 Webhook recibido: ${payload.event}`);
    console.log(`🔍 Signature recibida: ${signature.substring(0, 20)}...`);
    console.log(`🔍 WEBHOOK_SECRET configurado: ${WEBHOOK_SECRET ? 'SÍ' : 'NO'}`);
    console.log(`🔍 Longitud del secret: ${WEBHOOK_SECRET.length} caracteres`);
    console.log(`🔍 SMTP configurado: ${SMTP_USER ? 'SÍ' : 'NO'}`);
    
    // Validar firma HMAC
    const { valid: firmaValida, expectedHash, receivedHash } = await validateSignature(bodyText, signature, WEBHOOK_SECRET);
    
    if (!firmaValida) {
      console.error('❌ Firma HMAC inválida');
      console.error(`   Firma recibida: ${signature}`);
      console.error(`   Secret usado: ${WEBHOOK_SECRET.substring(0, 10)}...`);
      console.error(`   Hash recibido: ${receivedHash}`);
      console.error(`   Hash esperado: ${expectedHash}`);
      return new Response(JSON.stringify({ error: 'Firma inválida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Firma HMAC válida');
    
    // Verificar idempotencia (usar prefijo para separar de event-logger)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const notifierIdempotencyKey = `notifier-${payload.idempotency_key}`;
    const procesado = await yaFueProcesado(supabase, notifierIdempotencyKey);
    
    if (procesado) {
      console.log('🔁 Webhook duplicado para notifier, ignorando');
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook ya fue procesado por notifier',
        duplicate: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Verificación de idempotencia pasada');
    
    // Extraer email del destinatario desde el payload
    // El email viene en data.email para clientes, o data.clienteEmail para reservas
    const emailDestinatario = (payload.data.email as string) || 
                              (payload.data.clienteEmail as string) || 
                              SMTP_USER; // Fallback al remitente si no hay email
    
    // Generar y enviar email
    const htmlEmail = generarEmailHTML(payload.event, payload.data);
    const asuntoEmail = `[${payload.metadata.environment}] ${payload.event}`;
    
    console.log(`📧 === DEBUG SMTP ===`);
    console.log(`   SMTP_HOST: ${SMTP_HOST}`);
    console.log(`   SMTP_PORT: ${SMTP_PORT}`);
    console.log(`   SMTP_USER: ${SMTP_USER ? SMTP_USER.substring(0, 10) + '...' : 'NO CONFIGURADO'}`);
    console.log(`   SMTP_PASS: ${SMTP_PASS ? '***configurado***' : 'NO CONFIGURADO'}`);
    console.log(`   Destinatario: ${emailDestinatario}`);
    console.log(`   Asunto: ${asuntoEmail}`);
    console.log(`📧 Enviando email...`);
    
    const resultado = await enviarEmailSMTP(emailDestinatario, asuntoEmail, htmlEmail);
    
    if (!resultado.exito) {
      console.error(`❌ Error enviando email:`, resultado.error);
      await registrarEntrega(supabase, payload, false, resultado.error);
      
      // Retornar 500 para que el sistema reintente
      return new Response(JSON.stringify({
        error: 'Error enviando notificación',
        details: resultado.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`✅ Email enviado: ${resultado.messageId}`);
    
    // Marcar como procesado (con prefijo para separar de event-logger)
    await supabase
      .from('processed_webhooks')
      .insert({
        idempotency_key: notifierIdempotencyKey,
        event_id: payload.id,
        event_type: payload.event,
        processed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        result: { success: true, message_id: resultado.messageId }
      });
    
    // Registrar entrega exitosa
    await registrarEntrega(supabase, payload, true);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Notificación enviada exitosamente',
      message_id: resultado.messageId,
      event_type: payload.event
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    
    return new Response(JSON.stringify({
      error: 'Error interno del servidor',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

