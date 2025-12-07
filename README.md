# Sistema de Microservicios - Clientes y Reservas

Sistema de microservicios con arquitectura híbrida (HTTP + RabbitMQ) implementando estrategia de **Consumidor Idempotente** para garantizar procesamiento exactamente una vez.

## 🏗️ Arquitectura

```
┌─────────────┐
│   Cliente   │
│ (Postman)   │
└──────┬──────┘
       │ HTTP REST
       ▼
┌─────────────────┐
│  API Gateway    │
│    (Puerto 3000)│
└────┬────────┬───┘
     │        │
     │ HTTP   │ HTTP + RabbitMQ
     ▼        ▼
┌────────┐  ┌──────────┐
│Clientes│  │ Reservas │
│  :3001 │  │   :3002  │
└───┬────┘  └────┬─────┘
    │            │
    │ RabbitMQ   │
    └────────────┘
         │
    ┌────┴─────┐
    │  Redis   │ (Idempotencia)
    └──────────┘
```

### Componentes

1. **API Gateway** - Punto de entrada HTTP REST
2. **Microservicio Clientes** - Entidad Maestra (gestiona clientes)
3. **Microservicio Reservas** - Entidad Transaccional (gestiona reservas)
4. **RabbitMQ** - Message Broker para comunicación asíncrona
5. **Redis** - Almacenamiento de claves de idempotencia
6. **PostgreSQL** - 2 bases de datos independientes

## 🛡️ Estrategia de Resiliencia: Consumidor Idempotente

### Problema Resuelto
RabbitMQ garantiza entrega "At-least-once". Si la red falla antes del ACK, el mensaje se duplica. Procesar una reserva dos veces puede causar:
- Cobros duplicados
- Reservas fantasma
- Inconsistencia de datos

### Solución Implementada
Sistema de deduplicación usando **Idempotency Keys**:
- Cada mensaje tiene un `idempotenciaKey` único (UUID)
- Redis almacena las claves procesadas con TTL de 24 horas
- Si un mensaje llega múltiples veces, solo se procesa la primera vez
- Los mensajes duplicados retornan resultado cacheado

## 📋 Requisitos Previos

- Node.js 18+ 
- Docker y Docker Compose
- npm o yarn

## 🚀 Instalación y Ejecución

### Opción 1: Con Docker (Recomendado)

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# Verificar que todos los servicios estén corriendo
docker-compose ps

# Ver logs de un servicio específico
docker-compose logs -f api-gateway
```

### Opción 2: Desarrollo Local

```bash
# 1. Iniciar solo infraestructura (RabbitMQ, PostgreSQL, Redis)
docker-compose up rabbitmq db-clientes db-reservas redis

# 2. Instalar dependencias en cada microservicio
cd microservicio-clientes && npm install && cd ..
cd microservicio-reservas && npm install && cd ..
cd api-gateway && npm install && cd ..

# 3. Ejecutar cada servicio en terminal separada
cd microservicio-clientes && npm run start:dev
cd microservicio-reservas && npm run start:dev
cd api-gateway && npm run start:dev
```

## 📡 Endpoints API

Base URL: `http://localhost:3000/api`

### Clientes

#### Crear Cliente
```http
POST /api/clientes
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+58 412 1234567",
  "activo": true
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+58 412 1234567"
  }'
```

#### Listar Clientes
```http
GET /api/clientes
```

#### Obtener Cliente por ID
```http
GET /api/clientes/:id
```

#### Actualizar Cliente
```http
PATCH /api/clientes/:id
Content-Type: application/json

{
  "nombre": "Juan Carlos Pérez",
  "telefono": "+58 412 9876543"
}
```

#### Eliminar Cliente (Soft Delete)
```http
DELETE /api/clientes/:id
```

### Reservas

#### Crear Reserva
```http
POST /api/reservas
Content-Type: application/json
X-Idempotency-Key: <clave-unica-opcional>

{
  "clienteId": 1,
  "servicioNombre": "Consulta Médica",
  "fechaReserva": "2025-12-15T10:00:00Z",
  "duracionMinutos": 60,
  "notas": "Primera consulta"
}
```

**Nota**: Este endpoint implementa idempotencia. Puedes enviar un header `X-Idempotency-Key` con una clave única. Si envías el mismo request múltiples veces con la misma clave, solo se procesará una vez y las siguientes retornarán el resultado cacheado.

**Ejemplo con curl (con idempotencia):**
```bash
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: mi-clave-unica-123" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2025-12-25T14:00:00Z",
    "duracionMinutos": 30
  }'
```

#### Listar Reservas
```http
GET /api/reservas
```

#### Obtener Reserva por ID
```http
GET /api/reservas/:id
```

#### Obtener Reservas por Cliente
```http
GET /api/reservas/cliente/:clienteId
```

#### Cancelar Reserva
```http
PATCH /api/reservas/:id/cancelar
```

## 🧪 Guía de Pruebas Paso a Paso

### 1️⃣ Verificar que el Sistema Esté Ejecutándose

```bash
# Ver estado de los contenedores
docker-compose ps

# Deberías ver 7 contenedores "Up" y "healthy"
# - rabbitmq
# - redis
# - db-clientes
# - db-reservas
# - microservicio-clientes
# - microservicio-reservas
# - api-gateway
```

### 2️⃣ Crear un Cliente

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan.perez@example.com",
    "telefono": "555-1234"
  }'

# Respuesta esperada: JSON con el cliente creado y su ID
# Guarda el "id" para usarlo en las reservas
```

### 3️⃣ Verificar la Lista de Clientes

```bash
curl http://localhost:3000/api/clientes

# Deberías ver un array con el cliente que acabas de crear
```

### 4️⃣ Probar Idempotencia - Primera Reserva

Abre **DOS terminales**:

**Terminal 1 - Monitorear logs:**
```bash
docker-compose logs -f microservicio-reservas
```

**Terminal 2 - Crear reserva con clave de idempotencia:**
```bash
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: TEST-KEY-001" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2025-12-25T14:00:00Z",
    "duracionMinutos": 30
  }'
```

**Observa en Terminal 1:**
- ✅ `"📤 Enviando validación de cliente 1 vía RabbitMQ"`
- ✅ `"📥 Respuesta recibida de microservicio clientes"`
- ✅ `"✅ Mensaje marcado como procesado: TEST-KEY-001"`
- ✅ `"✅ Reserva creada: X para cliente 1"`

**Guarda el JSON de respuesta** - especialmente el `id` y `fechaCreacion`

### 5️⃣ Probar Idempotencia - Mensaje Duplicado

**En Terminal 2, ejecuta EXACTAMENTE el mismo comando:**
```bash
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: TEST-KEY-001" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2025-12-25T14:00:00Z",
    "duracionMinutos": 30
  }'
```

**Observa en Terminal 1:**
- ⚠️ `"⚠️  Mensaje duplicado detectado: TEST-KEY-001"`
- 📦 `"📦 Retornando resultado cacheado para: TEST-KEY-001"`
- 🔁 `"🔁 Mensaje duplicado ignorado. Retornando resultado cacheado"`

**Compara el JSON de respuesta con el anterior:**
- ✅ El `id` debe ser **EXACTAMENTE el mismo**
- ✅ La `fechaCreacion` debe ser **EXACTAMENTE la misma**
- ✅ NO se creó una reserva duplicada

### 6️⃣ Verificar en Redis

```bash
# Ver todas las claves de idempotencia almacenadas
docker exec -it redis redis-cli KEYS "idempotencia:*"

# Deberías ver: "idempotencia:TEST-KEY-001"

# Ver el contenido cacheado
docker exec -it redis redis-cli GET "idempotencia:TEST-KEY-001"

# Deberías ver el JSON completo de la reserva

# Ver el tiempo de vida restante (en segundos)
docker exec -it redis redis-cli TTL "idempotencia:TEST-KEY-001"

# Debería mostrar un número cercano a 86400 (24 horas)
```

### 7️⃣ Verificar en la Base de Datos

```bash
# Conectar a la base de datos de reservas
docker exec -it db-reservas psql -U admin -d reservas_db

# Dentro de PostgreSQL, ejecutar:
SELECT id, cliente_id, servicio_nombre, idempotencia_key, fecha_creacion 
FROM reservas 
WHERE idempotencia_key = 'TEST-KEY-001';

# Deberías ver SOLO 1 registro, no duplicados

# Salir de PostgreSQL
\q
```

### 8️⃣ Verificar RabbitMQ

Abre en tu navegador: **http://localhost:15672**
- Usuario: `admin`
- Contraseña: `admin123`

Ve a la pestaña **Queues**:
- ✅ `cola_validar_cliente`: Debería tener 1 consumidor activo
- ✅ Los mensajes deben estar siendo consumidos (messages = 0)

### 9️⃣ Prueba sin Clave de Idempotencia (Auto-generada)

```bash
# Crear reserva SIN especificar X-Idempotency-Key
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Masaje relajante",
    "fechaReserva": "2025-12-28T16:00:00Z",
    "duracionMinutos": 60
  }'

# El sistema generará un UUID automáticamente
# Verifica en la respuesta el campo "idempotenciaKey"
```

### 🔟 Listar Todas las Reservas

```bash
curl http://localhost:3000/api/reservas

# Deberías ver todas las reservas creadas
# Verifica que solo hay 1 reserva con TEST-KEY-001
```

---

## 🎯 Escenarios Adicionales de Prueba

### Escenario: Cliente Inactivo

```bash
# 1. Desactivar un cliente
curl -X PATCH http://localhost:3000/api/clientes/1 \
  -H "Content-Type: application/json" \
  -d '{"activo": false}'

# 2. Intentar crear reserva para ese cliente
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte",
    "fechaReserva": "2025-12-30T10:00:00Z",
    "duracionMinutos": 30
  }'

# Resultado esperado: Error 400 - "El cliente no está activo"
```

### Escenario: Cliente No Existe

```bash
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 99999,
    "servicioNombre": "Corte",
    "fechaReserva": "2025-12-30T10:00:00Z",
    "duracionMinutos": 30
  }'

# Resultado esperado: Error 404 - "El cliente no existe"
```

### Escenario: Fecha en el Pasado

```bash
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte",
    "fechaReserva": "2020-01-01T10:00:00Z",
    "duracionMinutos": 30
  }'

# Resultado esperado: Error 400 - "La fecha de reserva debe ser futura"
```

## 🔍 Monitoreo

### RabbitMQ Management
- URL: http://localhost:15672
- Usuario: `admin`
- Contraseña: `admin123`

### Logs de Servicios
```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f microservicio-reservas
docker-compose logs -f api-gateway
```

### Redis CLI
```bash
docker exec -it redis redis-cli
> MONITOR  # Ver todas las operaciones en tiempo real
```

## 📊 Base de Datos

### Clientes DB
```bash
docker exec -it db-clientes psql -U admin -d clientes_db
```

### Reservas DB
```bash
docker exec -it db-reservas psql -U admin -d reservas_db
```

## 🔧 Variables de Entorno

Cada microservicio tiene su archivo `.env` con configuraciones específicas (ver carpetas individuales).

## 🛑 Detener el Sistema

```bash
# Detener servicios manteniendo datos
docker-compose stop

# Detener y eliminar contenedores (mantiene volúmenes)
docker-compose down

# Eliminar todo incluyendo volúmenes (⚠️ borra datos)
docker-compose down -v
```

## 📁 Estructura del Proyecto

```
SegundoParcialServidorWeb/
├── api-gateway/
│   ├── src/
│   │   ├── clientes/
│   │   ├── reservas/
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── microservicio-clientes/
│   ├── src/
│   │   ├── clientes/
│   │   ├── database/
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── microservicio-reservas/
│   ├── src/
│   │   ├── reservas/
│   │   ├── idempotencia/
│   │   ├── database/
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🎯 Características Implementadas

### Arquitectura
- ✅ **Arquitectura híbrida** (HTTP REST + RabbitMQ)
- ✅ **API Gateway** como único punto de entrada
- ✅ **3 microservicios independientes** (Gateway, Clientes, Reservas)
- ✅ **Comunicación HTTP REST** (Cliente → Gateway)
- ✅ **Comunicación asíncrona RabbitMQ** (Reservas ↔ Clientes)
- ✅ **Sin comunicación HTTP directa** entre microservicios internos

### Resiliencia y Patrones
- ✅ **Consumidor Idempotente** con Redis
- ✅ **Claves de idempotencia UUID** únicas
- ✅ **TTL de 24 horas** para limpieza automática
- ✅ **ACK manual** en RabbitMQ (noAck: false)
- ✅ **Timeout de 5 segundos** en llamadas RabbitMQ
- ✅ **Prefetch count = 1** para procesamiento confiable
- ✅ **Resultado cacheado** para mensajes duplicados

### Persistencia
- ✅ **Bases de datos independientes** (PostgreSQL 15)
- ✅ **TypeORM** para gestión de entidades
- ✅ **Migraciones automáticas** (synchronize: true en desarrollo)
- ✅ **Soft delete** en entidades
- ✅ **Validación de integridad** referencial

### Infraestructura
- ✅ **Docker Compose** para orquestación
- ✅ **Health checks** para todos los servicios
- ✅ **Redes Docker** aisladas
- ✅ **Volúmenes persistentes** para datos
- ✅ **Variables de entorno** configurables

### Validación y Seguridad
- ✅ **Validación de clientes** antes de crear reservas
- ✅ **Class-validator** para DTOs
- ✅ **ValidationPipe global** en todos los microservicios
- ✅ **CORS habilitado** en API Gateway
- ✅ **Manejo de errores** centralizado

### Logging y Monitoreo
- ✅ **Logs estructurados** con emojis para mejor visualización
- ✅ **RabbitMQ Management UI** (puerto 15672)
- ✅ **Redis CLI** para inspección
- ✅ **PostgreSQL accesible** vía docker exec

## 📚 Tecnologías

- **Framework**: NestJS 10
- **ORM**: TypeORM
- **Message Broker**: RabbitMQ
- **Cache/Idempotencia**: Redis
- **Base de Datos**: PostgreSQL 15
- **Contenedores**: Docker & Docker Compose
- **Lenguaje**: TypeScript

## 📝 Notas Importantes

### Configuración de Hosts en Docker
Los archivos `.env` de los microservicios usan nombres de servicios de Docker:
- `DATABASE_HOST=db-clientes` y `db-reservas`
- `RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672`
- `REDIS_HOST=redis`

Estos nombres solo funcionan **dentro de Docker**. Para desarrollo local, cámbialos a `localhost`.

### Puertos Expuestos
- **3000**: API Gateway (punto de entrada)
- **3001**: Microservicio Clientes (solo para debugging)
- **3002**: Microservicio Reservas (solo para debugging)
- **5432**: PostgreSQL Clientes
- **5433**: PostgreSQL Reservas
- **5672**: RabbitMQ (AMQP)
- **15672**: RabbitMQ Management UI
- **6379**: Redis

### Limpieza del Sistema
```bash
# Reiniciar servicios conservando datos
docker-compose restart

# Detener y limpiar contenedores (mantiene volúmenes)
docker-compose down

# Limpieza completa (⚠️ ELIMINA TODOS LOS DATOS)
docker-compose down -v
docker system prune -a --volumes
```

---

## 🏆 Cumplimiento de Rúbrica

### ✅ Arquitectura Híbrida (30%)
- Correcta separación de responsabilidades
- API Gateway REST como punto de entrada único
- RabbitMQ obligatorio para comunicación interna
- Sin HTTP directo entre microservicios

### ✅ Complejidad de Estrategia (40%)
- Implementación de **Consumidor Idempotente** (estrategia avanzada)
- Claves UUID para deduplicación
- Redis con TTL de 24 horas
- ACK manual y prefetch control
- Resultado cacheado para duplicados

### ✅ Demo de Resiliencia (30%)
- Pruebas exitosas con idempotencia verificada
- Mensajes duplicados detectados y rechazados
- Consistencia de datos mantenida
- Logs detallados de cada operación

---

## 🤝 Autor

Proyecto desarrollado para el Segundo Parcial de Servidor Web

## 📄 Licencia

MIT


# En Git Bash
./demo-completo.sh