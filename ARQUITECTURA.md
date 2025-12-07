# Arquitectura del Sistema

## Visión General

El sistema implementa una arquitectura de microservicios con comunicación híbrida:
- **HTTP REST**: Para comunicación Gateway ↔ Cliente
- **RabbitMQ**: Para comunicación asíncrona entre microservicios

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE EXTERNO                          │
│                     (Postman / Frontend / cURL)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY :3000                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Punto de entrada único                                 │   │
│  │  • Enrutamiento HTTP                                      │   │
│  │  • Validación de requests                                 │   │
│  │  • Manejo centralizado de errores                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
               │ HTTP                      │ HTTP
               ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  MICROSERVICIO CLIENTES  │    │  MICROSERVICIO RESERVAS  │
│         :3001            │    │         :3002            │
│  ┌────────────────────┐  │    │  ┌────────────────────┐  │
│  │ Entidad Maestra    │  │    │  │ Entidad Trans.     │  │
│  │ • CRUD Clientes    │  │    │  │ • CRUD Reservas    │  │
│  │ • Validaciones     │  │    │  │ • Idempotencia     │  │
│  └────────────────────┘  │    │  │ • Validación async │  │
│           ▲              │    │  └────────┬───────────┘  │
│           │              │    │           │              │
│           │ TypeORM      │    │           │ TypeORM      │
│           ▼              │    │           ▼              │
│  ┌────────────────────┐  │    │  ┌────────────────────┐  │
│  │ PostgreSQL         │  │    │  │ PostgreSQL         │  │
│  │ clientes_db :5432  │  │    │  │ reservas_db :5433  │  │
│  └────────────────────┘  │    │  └────────────────────┘  │
└──────────┬───────────────┘    └───────────┬──────────────┘
           │                                │
           │                                │
           │      ┌─────────────────┐       │
           │      │   RabbitMQ      │       │
           └─────►│     :5672       │◄──────┘
                  │  ┌───────────┐  │
                  │  │cola_validar│ │
                  │  │_cliente    │ │
                  │  └───────────┘  │
                  └─────────────────┘
                           │
                           │
                  ┌────────▼──────────┐
                  │   Redis :6379     │
                  │  ┌─────────────┐  │
                  │  │ Idempotencia│  │
                  │  │ Keys Cache  │  │
                  │  └─────────────┘  │
                  └───────────────────┘
```

## Componentes del Sistema

### 1. API Gateway (Puerto 3000)

**Responsabilidades:**
- Punto de entrada único para todas las peticiones HTTP
- Enrutamiento de requests a microservicios correspondientes
- Validación básica de datos de entrada
- Transformación de respuestas
- Manejo centralizado de errores

**Tecnologías:**
- NestJS
- @nestjs/axios para HTTP client
- class-validator para validación

**Endpoints Expuestos:**
```
GET    /api/clientes
POST   /api/clientes
GET    /api/clientes/:id
PATCH  /api/clientes/:id
DELETE /api/clientes/:id

GET    /api/reservas
POST   /api/reservas
GET    /api/reservas/:id
GET    /api/reservas/cliente/:clienteId
PATCH  /api/reservas/:id/cancelar
```

### 2. Microservicio de Clientes (Puerto 3001)

**Responsabilidades:**
- Gestión completa de clientes (Entidad Maestra)
- CRUD de clientes
- Validación de existencia y estado de clientes
- Responder a solicitudes de validación vía RabbitMQ

**Base de Datos:**
- PostgreSQL independiente (puerto 5432)
- Tabla: `clientes`

**Patrones RabbitMQ:**
- **Consumidor**: `cola_validar_cliente` (Request-Reply Pattern)
- **Mensaje**: `validar_cliente`

**Modelo de Datos:**
```typescript
Cliente {
  id: number (PK)
  nombre: string
  email: string (unique)
  telefono: string
  activo: boolean
  fechaCreacion: Date
  fechaActualizacion: Date
  fechaEliminacion: Date (nullable - soft delete)
}
```

### 3. Microservicio de Reservas (Puerto 3002)

**Responsabilidades:**
- Gestión de reservas (Entidad Transaccional)
- CRUD de reservas
- Validación de clientes vía RabbitMQ antes de crear reserva
- Implementación de **Consumidor Idempotente**
- Deduplicación de mensajes usando Redis

**Base de Datos:**
- PostgreSQL independiente (puerto 5433)
- Tabla: `reservas`

**Patrones RabbitMQ:**
- **Productor**: Envía mensajes a `cola_validar_cliente`
- **Pattern**: Request-Reply

**Integración con Redis:**
- Almacena claves de idempotencia con TTL de 24 horas
- Formato: `idempotencia:<UUID>`

**Modelo de Datos:**
```typescript
Reserva {
  id: number (PK)
  clienteId: number (FK - lógico, no físico)
  servicioNombre: string
  fechaReserva: Date
  duracionMinutos: number
  notas: string
  estado: enum (pendiente, confirmada, cancelada, completada)
  idempotenciaKey: string (unique, UUID)
  fechaCreacion: Date
  fechaActualizacion: Date
  fechaCancelacion: Date (nullable)
}
```

### 4. RabbitMQ (Puertos 5672, 15672)

**Responsabilidades:**
- Message broker para comunicación asíncrona
- Garantiza entrega "At-least-once"
- Manejo de colas y exchanges

**Colas Configuradas:**
- `cola_validar_cliente`: Para validación de clientes

**Configuración de Resiliencia:**
```typescript
{
  durable: true,        // Cola sobrevive reinicios
  noAck: false,         // ACK manual requerido
  prefetchCount: 1      // Procesar un mensaje a la vez
}
```

**Credenciales:**
- Usuario: `admin`
- Contraseña: `admin123`

### 5. Redis (Puerto 6379)

**Responsabilidades:**
- Almacenamiento de claves de idempotencia
- Cache de resultados procesados
- TTL automático de 24 horas

**Estructura de Datos:**
```
Key:   idempotencia:<UUID>
Value: JSON serializado del resultado
TTL:   86400 segundos (24 horas)
```

### 6. PostgreSQL (Puertos 5432, 5433)

**Bases de Datos Independientes:**
- `clientes_db` (puerto 5432): Para microservicio de clientes
- `reservas_db` (puerto 5433): Para microservicio de reservas

**Justificación:**
- Desacoplamiento total entre microservicios
- Escalabilidad independiente
- Cumple con principios de microservicios

## Flujos de Comunicación

### Flujo 1: Crear Cliente

```
1. Cliente HTTP → POST /api/clientes
2. Gateway → HTTP POST → Microservicio Clientes
3. Microservicio Clientes → Valida datos
4. Microservicio Clientes → Guarda en PostgreSQL (clientes_db)
5. Microservicio Clientes → Respuesta
6. Gateway → Respuesta al cliente
```

### Flujo 2: Crear Reserva (Con Idempotencia)

```
1. Cliente HTTP → POST /api/reservas
2. Gateway → HTTP POST → Microservicio Reservas
3. Microservicio Reservas → Genera UUID idempotenciaKey
4. Microservicio Reservas → Verifica en Redis si ya procesado
   SI existe → Retorna resultado cacheado (FIN)
   NO existe → Continúa
5. Microservicio Reservas → Envía mensaje RabbitMQ: validar_cliente
6. RabbitMQ → Enruta a cola_validar_cliente
7. Microservicio Clientes → Consume mensaje
8. Microservicio Clientes → Consulta PostgreSQL (clientes_db)
9. Microservicio Clientes → Responde vía RabbitMQ: {existe, activo}
10. Microservicio Reservas → Recibe respuesta
11. SI cliente no existe o inactivo → Error (FIN)
    SI cliente válido → Continúa
12. Microservicio Reservas → Guarda en PostgreSQL (reservas_db)
13. Microservicio Reservas → Guarda en Redis (idempotencia_key, resultado)
14. Microservicio Reservas → Respuesta
15. Gateway → Respuesta al cliente
```

### Flujo 3: Mensaje Duplicado (Idempotencia)

```
1. Mismo request de reserva llega de nuevo
2. Microservicio Reservas → Genera mismo UUID (o recibe duplicado de RabbitMQ)
3. Microservicio Reservas → Verifica en Redis
4. Redis → Encuentra clave existente
5. Redis → Retorna resultado cacheado
6. Microservicio Reservas → Retorna resultado sin procesar
7. ✅ NO se crea reserva duplicada
```

## Estrategia de Resiliencia: Idempotent Consumer

### Problema Resuelto

RabbitMQ garantiza entrega "At-least-once". Escenarios problemáticos:

1. **Fallo de red después del procesamiento pero antes del ACK**
   - Mensaje se reenvía
   - Sin idempotencia: reserva duplicada

2. **Reinicio del microservicio con mensajes sin ACK**
   - RabbitMQ reenvía mensajes
   - Sin idempotencia: procesamiento duplicado

3. **Cliente reenvía request (retry en frontend)**
   - Mismo request llega múltiples veces
   - Sin idempotencia: múltiples reservas

### Solución Implementada

**1. Generación de Clave de Idempotencia**
```typescript
const claveIdempotencia = uuidv4();
```

**2. Verificación en Redis**
```typescript
const yaFueProcesado = await idempotenciaService.yaFueProcesado(claveIdempotencia);
if (yaFueProcesado) {
  return await idempotenciaService.obtenerResultadoCacheado(claveIdempotencia);
}
```

**3. Procesamiento y Almacenamiento**
```typescript
const resultado = await procesarReserva(datos);
await idempotenciaService.marcarComoProcesado(claveIdempotencia, resultado);
```

**4. TTL Automático**
- Redis elimina automáticamente claves después de 24 horas
- Libera memoria sin intervención manual

### Garantías

✅ **Exactly-once semantics** a nivel de aplicación
✅ **Sin duplicados en base de datos**
✅ **Respuestas consistentes** para requests duplicados
✅ **Performance óptimo** usando cache (Redis)

## Decisiones de Arquitectura

### ¿Por qué HTTP en Gateway → Microservicios?

- **Sincronía necesaria**: Cliente espera respuesta inmediata
- **Simplicidad**: HTTP REST es estándar y simple
- **Debugging**: Fácil de probar con Postman/curl

### ¿Por qué RabbitMQ entre Microservicios?

- **Desacoplamiento**: Reservas no depende de disponibilidad HTTP de Clientes
- **Resiliencia**: RabbitMQ garantiza entrega
- **Requisito del proyecto**: Comunicación asíncrona obligatoria

### ¿Por qué Redis para Idempotencia?

- **Performance**: Acceso O(1) a claves
- **TTL automático**: No requiere limpieza manual
- **Persistencia opcional**: Puede configurarse para durabilidad

### ¿Por qué Bases de Datos Separadas?

- **Desacoplamiento total**: Sin foreign keys entre servicios
- **Escalabilidad**: Cada DB escala independientemente
- **Resiliencia**: Fallo en una DB no afecta otra

## Escalabilidad

### Escalar Microservicios

```bash
docker-compose up --scale microservicio-reservas=3
```

**Consideraciones:**
- RabbitMQ distribuye mensajes entre instancias (Round-robin)
- Cada instancia comparte mismo Redis (idempotencia funciona)
- Cada instancia conecta a misma DB (connection pooling)

### Escalar Base de Datos

- **Read Replicas**: Para lecturas intensivas
- **Sharding**: Por cliente_id o fecha
- **Connection Pooling**: TypeORM lo maneja automáticamente

### Escalar Redis

- **Redis Cluster**: Para alta disponibilidad
- **Redis Sentinel**: Para failover automático

## Seguridad

### Consideraciones Implementadas

- Validación de entrada con `class-validator`
- Variables de entorno para credenciales
- Soft delete (datos nunca se eliminan físicamente)

### Mejoras Futuras

- Autenticación JWT
- Rate limiting
- Encriptación de datos sensibles
- SSL/TLS para comunicaciones

## Monitoreo y Observabilidad

### Logs Estructurados

Cada servicio usa `Logger` de NestJS:
```typescript
this.logger.log('Cliente creado: 123');
this.logger.warn('Mensaje duplicado detectado');
this.logger.error('Error al conectar a DB');
```

### Métricas Disponibles

- RabbitMQ Management UI: http://localhost:15672
- Redis CLI: `docker exec -it redis redis-cli`
- PostgreSQL logs: `docker-compose logs db-clientes`

### Mejoras Futuras

- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Distributed Tracing (Jaeger)
- Health checks expuestos

## Testing

### Pruebas Recomendadas

**1. Prueba de Idempotencia:**
```bash
# Enviar mismo request 3 veces
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/reservas -H "Content-Type: application/json" -d '{...}'
done

# Verificar que solo existe 1 reserva
docker exec -it db-reservas psql -U admin -d reservas_db -c "SELECT COUNT(*) FROM reservas;"
```

**2. Prueba de Resiliencia:**
```bash
# Crear reserva
curl -X POST http://localhost:3000/api/reservas ...

# Reiniciar microservicio
docker-compose restart microservicio-reservas

# Verificar logs
docker-compose logs -f microservicio-reservas
# Buscar: "Mensaje duplicado detectado"
```

**3. Prueba de Cliente Inválido:**
```bash
curl -X POST http://localhost:3000/api/reservas \
  -d '{"clienteId": 99999, ...}'
# Esperar: 404 Not Found
```

## Referencias

- [NestJS Documentation](https://docs.nestjs.com/)
- [RabbitMQ Patterns](https://www.rabbitmq.com/getstarted.html)
- [Redis Idempotency](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Microservices Patterns](https://microservices.io/patterns/index.html)
