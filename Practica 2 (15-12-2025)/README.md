# 🚀 Sistema de Microservicios con Webhooks y Circuit Breaker

## 📋 Descripción del Proyecto

Este proyecto implementa una arquitectura de **microservicios** para un sistema de gestión de reservas con las siguientes características avanzadas:

- **Comunicación asíncrona** entre servicios usando RabbitMQ
- **Sistema de Webhooks** para notificaciones en tiempo real
- **Patrón Circuit Breaker** para resiliencia
- **Idempotencia** para garantizar procesamiento único de mensajes
- **Notificaciones por Email** a través de Supabase Edge Functions

---

## 🏗️ Arquitectura del Sistema

```
                                    ┌─────────────────────────────────────────────┐
                                    │              SUPABASE CLOUD                 │
                                    │  ┌─────────────────────────────────────┐   │
                                    │  │       Edge Functions (Deno)         │   │
                                    │  │  ┌─────────────────────────────┐   │   │
                                    │  │  │   webhook-event-logger      │   │   │
                      Webhooks      │  │  │   • Valida firma HMAC       │   │   │
                   ┌───────────────►│  │  │   • Guarda eventos en BD    │   │   │
                   │                │  │  │   • Control de idempotencia │   │   │
                   │                │  │  └─────────────────────────────┘   │   │
                   │                │  │  ┌─────────────────────────────┐   │   │
                   │                │  │  │  webhook-external-notifier  │   │   │
                   │                │  │  │   • Valida firma HMAC       │   │   │
                   │                │  │  │   • Envía emails (SMTP)     │◄──┼───┼──► 📧 Email
                   │                │  │  │   • Control de idempotencia │   │   │
                   │                │  │  └─────────────────────────────┘   │   │
                   │                │  └─────────────────────────────────────┘   │
                   │                │  ┌─────────────────────────────────────┐   │
                   │                │  │        PostgreSQL (Supabase)        │   │
                   │                │  │  • webhook_subscriptions            │   │
                   │                │  │  • webhook_events                   │   │
                   │                │  │  • webhook_deliveries               │   │
                   │                │  │  • processed_webhooks               │   │
                   │                │  │  • circuit_breaker_states           │   │
                   │                │  └─────────────────────────────────────┘   │
                   │                └─────────────────────────────────────────────┘
                   │
┌──────────────────┴───────────────────────────────────────────────────────────────┐
│                              DOCKER COMPOSE                                       │
│                                                                                   │
│   ┌─────────────────┐      ┌─────────────────────────────────────────────────┐   │
│   │   API Gateway   │      │                 MICROSERVICIOS                  │   │
│   │    (NestJS)     │      │                                                 │   │
│   │                 │      │  ┌─────────────────────┐  ┌─────────────────┐   │   │
│   │  Puerto: 3000   │      │  │ microservicio-     │  │ microservicio-  │   │   │
│   │                 │      │  │ clientes           │  │ reservas        │   │   │
│   │  Endpoints:     │      │  │                    │  │                 │   │   │
│   │  /clientes      │◄─────┼─►│ • CRUD Clientes    │◄─┤ • CRUD Reservas │   │   │
│   │  /reservas      │ AMQP │  │ • Webhooks         │  │ • Webhooks      │   │   │
│   │                 │      │  │ • Circuit Breaker  │  │ • Circuit Break │   │   │
│   └─────────────────┘      │  │                    │  │ • Idempotencia  │   │   │
│           │                │  └─────────┬──────────┘  └────────┬────────┘   │   │
│           │                │            │                      │            │   │
│           │                └────────────┼──────────────────────┼────────────┘   │
│           │                             │                      │                │
│           │                             │    RabbitMQ          │                │
│           └─────────────────────────────┼──────────────────────┤                │
│                                         │                      │                │
│   ┌─────────────────────────────────────┴──────────────────────┴───────────┐   │
│   │                         INFRAESTRUCTURA                                │   │
│   │                                                                         │   │
│   │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌────────────┐  │   │
│   │  │  RabbitMQ   │   │    Redis    │   │ PostgreSQL  │   │ PostgreSQL │  │   │
│   │  │  :5672      │   │   :6379     │   │ db-clientes │   │ db-reservas│  │   │
│   │  │  :15672     │   │             │   │   :5432     │   │   :5433    │  │   │
│   │  │             │   │ • Circuit   │   │             │   │            │  │   │
│   │  │ • cola_     │   │   Breaker   │   │             │   │            │  │   │
│   │  │   clientes  │   │ • Idempot.  │   │             │   │            │  │   │
│   │  │ • cola_     │   │             │   │             │   │            │  │   │
│   │  │   reservas  │   │             │   │             │   │            │  │   │
│   │  │ • cola_     │   │             │   │             │   │            │  │   │
│   │  │   validar   │   │             │   │             │   │            │  │   │
│   │  └─────────────┘   └─────────────┘   └─────────────┘   └────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes Implementados

### 1. **API Gateway** (`api-gateway/`)
Punto de entrada único para todas las peticiones HTTP.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/clientes` | POST | Crear cliente |
| `/clientes` | GET | Listar clientes |
| `/clientes/:id` | GET | Obtener cliente |
| `/clientes/:id` | PATCH | Actualizar cliente |
| `/clientes/:id` | DELETE | Eliminar cliente (soft delete) |
| `/reservas` | POST | Crear reserva |
| `/reservas` | GET | Listar reservas |
| `/reservas/:id` | GET | Obtener reserva |
| `/reservas/cliente/:clienteId` | GET | Reservas por cliente |
| `/reservas/:id/cancelar` | PATCH | Cancelar reserva |

### 2. **Microservicio Clientes** (`microservicio-clientes/`)
Gestiona todo el ciclo de vida de los clientes.

**Características:**
- CRUD completo de clientes
- Soft delete (eliminación lógica)
- Validación de clientes para reservas vía RabbitMQ
- **Publicación de webhooks** cuando se crea un cliente

### 3. **Microservicio Reservas** (`microservicio-reservas/`)
Gestiona las reservas con validación de clientes.

**Características:**
- CRUD completo de reservas
- Validación de cliente vía RabbitMQ antes de crear reserva
- **Idempotencia** con Redis para evitar duplicados
- **Publicación de webhooks** cuando se crea o cancela una reserva

### 4. **Sistema de Webhooks**
Sistema completo para notificar eventos a servicios externos.

**Eventos soportados:**
- `cliente.creado` - Cuando se registra un nuevo cliente
- `reserva.creada` - Cuando se crea una nueva reserva
- `reserva.cancelada` - Cuando se cancela una reserva

---

## 🛡️ Patrones de Resiliencia Implementados

### 1. **Serverless Circuit Breaker** (Opción D)
Protege el sistema de continuar enviando requests a servicios externos que están fallando.

```
Estados del Circuit Breaker:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│    ┌────────┐  5 fallos   ┌────────┐  timeout  ┌──────────┐ │
│    │ CLOSED │────────────►│  OPEN  │──────────►│ HALF_OPEN│ │
│    │ 🟢     │             │  🔴    │           │   🟡     │ │
│    └────┬───┘             └────────┘           └─────┬────┘ │
│         │                      ▲                     │      │
│         │                      │                     │      │
│         │                      │ 1 fallo             │      │
│         │                      └─────────────────────┤      │
│         │                                            │      │
│         │◄───────────────────────────────────────────┘      │
│         │            2 éxitos consecutivos                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Configuración:**
- `failureThreshold`: 5 fallos consecutivos → OPEN
- `successThreshold`: 2 éxitos en HALF_OPEN → CLOSED
- `timeout`: 30 segundos antes de intentar HALF_OPEN

### 2. **Idempotent Consumer**
Garantiza que cada mensaje se procese exactamente una vez.

**Implementación:**
- **En microservicio-reservas**: Redis almacena claves de idempotencia
- **En Edge Functions**: PostgreSQL tabla `processed_webhooks`

### 3. **Retry con Exponential Backoff**
Reintentos inteligentes con tiempos de espera crecientes.

```
Intento 1: Inmediato
Intento 2: +1 minuto
Intento 3: +5 minutos
Intento 4: +30 minutos
Intento 5: +2 horas
Intento 6: +12 horas
```

### 4. **Firma HMAC-SHA256**
Seguridad en webhooks para verificar autenticidad.

```
┌───────────────────┐                    ┌───────────────────┐
│   NestJS          │                    │   Edge Function   │
│   (Publisher)     │                    │   (Consumer)      │
│                   │                    │                   │
│  payload ─────────┼───────────────────►│ ← payload         │
│                   │                    │                   │
│  HMAC(payload,    │   X-Webhook-       │   HMAC(payload,   │
│  secret) ─────────┼───Signature────────┼─► secret)         │
│                   │                    │                   │
│                   │                    │  ¿Coinciden?      │
│                   │                    │  ✅ Procesar      │
│                   │                    │  ❌ Rechazar      │
└───────────────────┘                    └───────────────────┘
```

---

## 🗄️ Base de Datos Supabase

### Tablas Creadas

| Tabla | Propósito |
|-------|-----------|
| `webhook_subscriptions` | URLs suscritas a eventos con configuración de retry |
| `webhook_events` | Registro de todos los eventos recibidos |
| `webhook_deliveries` | Auditoría de intentos de entrega |
| `processed_webhooks` | Control de idempotencia (TTL 7 días) |
| `circuit_breaker_states` | Estado del Circuit Breaker por endpoint |

### Schema Visual

```sql
┌──────────────────────────┐       ┌──────────────────────────┐
│ webhook_subscriptions    │       │ webhook_events           │
├──────────────────────────┤       ├──────────────────────────┤
│ id (PK)                  │       │ id (PK)                  │
│ event_type               │       │ event_id (UNIQUE)        │
│ url                      │       │ event_type               │
│ secret                   │       │ idempotency_key (UNIQUE) │
│ is_active                │       │ payload (JSONB)          │
│ retry_config (JSONB)     │       │ metadata (JSONB)         │
│ created_at               │       │ received_at              │
│ updated_at               │       │ processed_at             │
└──────────────────────────┘       └──────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────┐
│ webhook_deliveries       │       │ processed_webhooks       │
├──────────────────────────┤       ├──────────────────────────┤
│ id (PK)                  │       │ id (PK)                  │
│ subscription_id (FK)     │       │ idempotency_key (UNIQUE) │
│ event_id                 │       │ event_id                 │
│ event_type               │       │ event_type               │
│ attempt_number           │       │ processed_at             │
│ status_code              │       │ expires_at (TTL 7 días)  │
│ status                   │       │ result (JSONB)           │
│ error_message            │       └──────────────────────────┘
│ delivered_at             │
│ duration_ms              │       ┌──────────────────────────┐
│ circuit_breaker_state    │       │ circuit_breaker_states   │
└──────────────────────────┘       ├──────────────────────────┤
                                   │ id (PK)                  │
                                   │ endpoint_url (UNIQUE)    │
                                   │ state                    │
                                   │ failure_count            │
                                   │ last_failure_at          │
                                   │ success_count            │
                                   │ updated_at               │
                                   └──────────────────────────┘
```

---

## ⚡ Supabase Edge Functions

### 1. `webhook-event-logger`
Recibe y registra todos los eventos de webhook.

**Responsabilidades:**
- ✅ Validar firma HMAC-SHA256
- ✅ Verificar timestamp (anti-replay, máx 5 minutos)
- ✅ Control de idempotencia
- ✅ Guardar evento en `webhook_events`

### 2. `webhook-external-notifier`
Envía notificaciones por email a los clientes.

**Responsabilidades:**
- ✅ Validar firma HMAC-SHA256
- ✅ Control de idempotencia separado
- ✅ Generar email HTML según tipo de evento
- ✅ Enviar email vía SMTP (Gmail)
- ✅ Registrar resultado en `webhook_deliveries`

**Emails generados:**
- 📧 **cliente.creado**: "Nuevo Cliente Registrado"
- 📧 **reserva.creada**: "Nueva Reserva Creada"
- 📧 **reserva.cancelada**: "Reserva Cancelada"

---

## 🚀 Cómo Ejecutar el Proyecto

### Prerequisitos
- Docker y Docker Compose
- Node.js 18+
- Supabase CLI
- Cuenta de Supabase

### 1. Clonar y configurar

```bash
# Clonar repositorio
git clone <repositorio>
cd practica-2

# Configurar variables de entorno en docker-compose.yml
# Ya están configuradas las siguientes:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - WEBHOOK_SECRET
```

### 2. Ejecutar con Docker Compose

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# O en segundo plano
docker-compose up -d --build
```

### 3. Configurar Supabase

```bash
# 1. Ejecutar el schema SQL en Supabase SQL Editor
# (Copiar contenido de supabase-schema.sql)

# 2. Configurar secrets de Edge Functions
supabase secrets set WEBHOOK_SECRET="wH9R\$Kf2pL7N@QxA!m6D#E4ZC8bS5Yt0"
supabase secrets set SMTP_HOST="smtp.gmail.com"
supabase secrets set SMTP_PORT="587"
supabase secrets set SMTP_USER="tu-email@gmail.com"
supabase secrets set SMTP_PASS="tu-app-password"

# 3. Desplegar Edge Functions
supabase functions deploy webhook-event-logger --no-verify-jwt
supabase functions deploy webhook-external-notifier --no-verify-jwt

# 4. IMPORTANTE: Actualizar el secret en la tabla webhook_subscriptions
# UPDATE webhook_subscriptions SET secret = 'wH9R$Kf2pL7N@QxA!m6D#E4ZC8bS5Yt0';
```

### 4. Verificar servicios

```bash
# RabbitMQ Management
http://localhost:15672 (admin/admin123)

# API Gateway
http://localhost:3000

# Health checks
curl http://localhost:3000/clientes
curl http://localhost:3000/reservas
```

---

## 🧪 Pruebas del Sistema

### Crear un Cliente (dispara webhook `cliente.creado`)

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan.perez@ejemplo.com",
    "telefono": "+57 300 123 4567"
  }'
```

### Crear una Reserva (dispara webhook `reserva.creada`)

```bash
curl -X POST http://localhost:3000/reservas \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: reserva-unica-123" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2025-12-20T10:00:00Z",
    "duracionMinutos": 60,
    "notas": "Primera visita"
  }'
```

### Cancelar una Reserva (dispara webhook `reserva.cancelada`)

```bash
curl -X PATCH http://localhost:3000/reservas/1/cancelar
```

---

## 📊 Monitoreo y Logs

### Ver logs de microservicios

```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker logs -f microservicio-clientes
docker logs -f microservicio-reservas
docker logs -f api-gateway
```

### Ver logs de Edge Functions

```bash
supabase functions logs webhook-event-logger
supabase functions logs webhook-external-notifier
```

### Verificar Circuit Breaker en Redis

```bash
docker exec redis redis-cli KEYS "circuit-breaker:*"
docker exec redis redis-cli GET "circuit-breaker:<hash>"
```

### Consultar webhooks en Supabase

```sql
-- Eventos recibidos
SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 10;

-- Entregas realizadas
SELECT * FROM webhook_deliveries ORDER BY delivered_at DESC LIMIT 10;

-- Webhooks procesados (idempotencia)
SELECT * FROM processed_webhooks ORDER BY processed_at DESC LIMIT 10;
```

---

## 📁 Estructura del Proyecto

```
practica-2/
├── api-gateway/
│   └── src/
│       ├── clientes/          # Módulo de clientes (proxy a microservicio)
│       ├── reservas/          # Módulo de reservas (proxy a microservicio)
│       └── app.module.ts
│
├── microservicio-clientes/
│   └── src/
│       ├── clientes/          # CRUD de clientes
│       ├── webhooks/          # Publisher + Circuit Breaker
│       │   ├── webhook-publisher.service.ts
│       │   ├── webhook-security.service.ts
│       │   ├── circuit-breaker.service.ts
│       │   └── webhooks.module.ts
│       └── redis/             # Módulo Redis
│
├── microservicio-reservas/
│   └── src/
│       ├── reservas/          # CRUD de reservas
│       ├── idempotencia/      # Servicio de idempotencia (Redis)
│       └── webhooks/          # Publisher + Circuit Breaker
│
├── supabase/
│   └── functions/
│       ├── webhook-event-logger/      # Edge Function 1
│       │   └── index.ts
│       └── webhook-external-notifier/ # Edge Function 2
│           └── index.ts
│
├── docker-compose.yml         # Orquestación de servicios
├── supabase-schema.sql        # Schema de base de datos
└── README.md                  # Esta documentación
```

---

## 🔑 Variables de Entorno Importantes

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (backend) | `eyJ...` |
| `WEBHOOK_SECRET` | Secret para firmar webhooks | `wH9R$Kf2...` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` o `465` |
| `SMTP_USER` | Usuario SMTP | `tu-email@gmail.com` |
| `SMTP_PASS` | Contraseña de aplicación | `xxxx xxxx xxxx xxxx` |

---

## 🎯 Resumen de lo Implementado

| Componente | Tecnología | Estado |
|------------|------------|--------|
| API Gateway | NestJS | ✅ Completo |
| Microservicio Clientes | NestJS + TypeORM | ✅ Completo |
| Microservicio Reservas | NestJS + TypeORM | ✅ Completo |
| Comunicación Asíncrona | RabbitMQ | ✅ Completo |
| Circuit Breaker | Redis + NestJS | ✅ Completo |
| Idempotencia | Redis + PostgreSQL | ✅ Completo |
| Webhooks Publisher | NestJS + Supabase | ✅ Completo |
| Webhook Event Logger | Supabase Edge Function | ✅ Completo |
| Webhook Notifier (Email) | Supabase Edge Function + SMTP | ✅ Completo |
| Firma HMAC-SHA256 | Crypto | ✅ Completo |
| Retry + Exponential Backoff | NestJS | ✅ Completo |

---

## 👨‍💻 Autor

**Práctica 2 - Aplicaciones Servidor Web**  
Quinto Semestre - 15/12/2025

---

## 📚 Referencias

- [NestJS Documentation](https://docs.nestjs.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Idempotent Consumer Pattern](https://microservices.io/patterns/communication-style/idempotent-consumer.html)
- [Webhook Security Best Practices](https://webhook.site/docs)
