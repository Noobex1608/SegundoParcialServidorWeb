-- ============================================================
-- SCHEMA DE BASE DE DATOS PARA WEBHOOKS
-- Sistema de microservicios - Taller 2
-- ============================================================

-- Tabla 1: webhook_subscriptions
-- Gestión de URLs suscritas a eventos
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB DEFAULT '{
    "max_attempts": 6,
    "backoff_type": "exponential",
    "initial_delay_ms": 60000,
    "delays_ms": [60000, 300000, 1800000, 7200000, 43200000]
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_triggered_at TIMESTAMP,
  CONSTRAINT unique_event_url UNIQUE(event_type, url)
);

-- Tabla 2: webhook_events
-- Registro de todos los eventos recibidos por las Edge Functions
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  source VARCHAR(100),
  version VARCHAR(20)
);

-- Tabla 3: webhook_deliveries
-- Auditoría de todos los intentos de entrega
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status_code INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'circuit_open')),
  error_message TEXT,
  delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  circuit_breaker_state VARCHAR(20)
);

-- Tabla 4: processed_webhooks
-- Control de idempotencia (deduplicación)
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id SERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  event_id VARCHAR(255),
  event_type VARCHAR(100),
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  result JSONB
);

-- Tabla 5: circuit_breaker_states
-- Estado del Circuit Breaker por endpoint
CREATE TABLE IF NOT EXISTS circuit_breaker_states (
  id SERIAL PRIMARY KEY,
  endpoint_url VARCHAR(500) UNIQUE NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMP,
  opened_at TIMESTAMP,
  half_open_at TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_failure_count CHECK (failure_count >= 0)
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índices para webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Índices para webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription_status ON webhook_deliveries(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- Índices para processed_webhooks
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_expires_at ON processed_webhooks(expires_at);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event_type ON processed_webhooks(event_type);

-- Índices para webhook_subscriptions
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_type ON webhook_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_is_active ON webhook_subscriptions(is_active);

-- Índices para circuit_breaker_states
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_endpoint ON circuit_breaker_states(endpoint_url);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state ON circuit_breaker_states(state);

-- ============================================================
-- FUNCIÓN PARA LIMPIEZA AUTOMÁTICA (TTL)
-- ============================================================

-- Función para eliminar webhooks expirados
CREATE OR REPLACE FUNCTION cleanup_expired_webhooks()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhooks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DATOS DE EJEMPLO (SUSCRIPCIONES INICIALES)
-- ============================================================

-- Insertar suscripciones a las Edge Functions
-- IMPORTANTE: Reemplaza estas URLs con las URLs reales de tus Edge Functions después de desplegarlas

INSERT INTO webhook_subscriptions (event_type, url, secret, is_active) VALUES
  ('reserva.creada', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-event-logger', 'tu_super_secret_seguro_para_webhooks_12345', true),
  ('reserva.creada', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-external-notifier', 'tu_super_secret_seguro_para_webhooks_12345', true),
  ('reserva.cancelada', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-event-logger', 'tu_super_secret_seguro_para_webhooks_12345', true),
  ('reserva.cancelada', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-external-notifier', 'tu_super_secret_seguro_para_webhooks_12345', true),
  ('cliente.creado', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-event-logger', 'tu_super_secret_seguro_para_webhooks_12345', true),
  ('cliente.creado', 'https://hquuaxlwfflazotdknhl.supabase.co/functions/v1/webhook-external-notifier', 'tu_super_secret_seguro_para_webhooks_12345', true)
ON CONFLICT (event_type, url) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN DE TABLAS CREADAS
-- ============================================================

-- Puedes ejecutar esta query para verificar que todas las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'webhook_subscriptions',
    'webhook_events',
    'webhook_deliveries',
    'processed_webhooks',
    'circuit_breaker_states'
  )
ORDER BY table_name;

-- ============================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================

COMMENT ON TABLE webhook_subscriptions IS 'Gestión de suscriptores a eventos de webhook';
COMMENT ON TABLE webhook_events IS 'Registro de todos los eventos de webhook recibidos';
COMMENT ON TABLE webhook_deliveries IS 'Auditoría completa de intentos de entrega de webhooks';
COMMENT ON TABLE processed_webhooks IS 'Control de idempotencia con TTL de 7 días';
COMMENT ON TABLE circuit_breaker_states IS 'Estado del Circuit Breaker por endpoint externo';

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================

