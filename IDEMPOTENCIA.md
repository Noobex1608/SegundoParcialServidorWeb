# Estrategia de Resiliencia: Consumidor Idempotente (Idempotent Consumer)

## 📋 Índice

1. [Introducción](#introducción)
2. [El Problema](#el-problema)
3. [La Solución](#la-solución)
4. [Implementación Técnica](#implementación-técnica)
5. [Flujo de Funcionamiento](#flujo-de-funcionamiento)
6. [Casos de Uso](#casos-de-uso)
7. [Pruebas y Validación](#pruebas-y-validación)
8. [Ventajas y Desventajas](#ventajas-y-desventajas)
9. [Referencias](#referencias)

---

## Introducción

La estrategia **Idempotent Consumer** (Consumidor Idempotente) es un patrón de diseño fundamental en arquitecturas de microservicios que garantiza que un mensaje puede ser procesado múltiples veces sin causar efectos secundarios no deseados.

### Definición de Idempotencia

> Una operación es **idempotente** si ejecutarla múltiples veces produce el mismo resultado que ejecutarla una sola vez.

**Ejemplos:**
- ✅ **Idempotente**: `SET usuario.nombre = "Juan"` (siempre resulta en el mismo estado)
- ❌ **NO Idempotente**: `UPDATE saldo = saldo + 100` (cada ejecución cambia el resultado)

---

## El Problema

### Garantía de Entrega de RabbitMQ

RabbitMQ (y la mayoría de message brokers) garantiza **"At-least-once delivery"**, lo que significa:

- Un mensaje **SIEMPRE** será entregado **AL MENOS UNA VEZ**
- Puede ser entregado **MÚLTIPLES VECES** en ciertos escenarios

### Escenarios Problemáticos

#### 1. Fallo de Red Después del Procesamiento

```
┌─────────────┐           ┌─────────────┐
│  RabbitMQ   │           │ Microservicio│
│             │           │   Reservas   │
└──────┬──────┘           └──────┬───────┘
       │                         │
       │ 1. Envía mensaje        │
       │─────────────────────────>│
       │                         │
       │                   2. Procesa mensaje
       │                   3. Guarda en DB ✓
       │                         │
       │ 4. ACK (confirmación)   │
       │<─ ✗ FALLO DE RED ─────X │
       │                         │
       │ 5. Reenvía mensaje      │
       │─────────────────────────>│
       │                   6. ¡Procesa de nuevo!
       │                   7. ¡Reserva duplicada! ❌
```

#### 2. Reinicio del Microservicio

```
Microservicio recibe mensaje → Procesa → REINICIO → Mensaje sin ACK
RabbitMQ detecta falta de ACK → Reenvía mensaje → ¡Duplicado!
```

#### 3. Cliente Reenvía Request (Retry)

```
Usuario hace clic en "Reservar" → Timeout →
Usuario hace clic de nuevo → ¡2 reservas creadas! ❌
```

### Consecuencias

Sin idempotencia:

- 💳 **Cobros duplicados** en pagos
- 📅 **Reservas duplicadas** en sistemas de citas
- 📦 **Envíos duplicados** en e-commerce
- 💰 **Pérdidas financieras** y **mala experiencia de usuario**

---

## La Solución

### Principio Fundamental

> Antes de procesar un mensaje, verificar si ya fue procesado. Si fue procesado, retornar el resultado cacheado sin volver a ejecutar la lógica de negocio.

### Componentes Clave

1. **Clave de Idempotencia (Idempotency Key)**
   - UUID único que identifica cada mensaje
   - Debe ser determinista (mismo request = mismo UUID)

2. **Almacenamiento de Estado (Redis)**
   - Guarda las claves ya procesadas
   - Almacena el resultado para devolverlo en caso de duplicado
   - TTL automático para liberar memoria

3. **Lógica de Verificación**
   - Antes de procesar: verificar en Redis
   - Después de procesar: guardar en Redis

---

## Implementación Técnica

### Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                  Microservicio Reservas                       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            1. Recibe Mensaje RabbitMQ                   │  │
│  │   { clienteId: 1, servicioNombre: "Consulta", ... }    │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│                        ▼                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │        2. Genera/Obtiene Clave Idempotencia            │  │
│  │           idempotenciaKey = uuidv4()                   │  │
│  │        Ejemplo: "a3f8b2c5-1234-5678-90ab-cdef12345678" │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│                        ▼                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │     3. Verifica en Redis si Ya Fue Procesado            │  │
│  │         GET idempotencia:a3f8b2c5-...                  │  │
│  └─────────────────────┬──────────────────────────────────┘  │
│                        │                                      │
│             ┌──────────┴──────────┐                           │
│             │                     │                           │
│      ┌──────▼──────┐       ┌─────▼─────┐                     │
│      │ EXISTE      │       │ NO EXISTE │                     │
│      │ en Redis    │       │ en Redis  │                     │
│      └──────┬──────┘       └─────┬─────┘                     │
│             │                     │                           │
│             ▼                     ▼                           │
│  ┌──────────────────┐   ┌─────────────────────────────────┐ │
│  │ 4a. Retornar     │   │ 4b. PROCESAR                    │ │
│  │ resultado        │   │ • Validar cliente (RabbitMQ)    │ │
│  │ cacheado         │   │ • Guardar en PostgreSQL         │ │
│  │ (NO procesar)    │   │ • Generar resultado             │ │
│  └──────────────────┘   └──────────┬──────────────────────┘ │
│                                    │                         │
│                                    ▼                         │
│                       ┌──────────────────────────────────┐   │
│                       │ 5. Guardar en Redis con TTL     │   │
│                       │ SET idempotencia:a3f8... TTL:24h│   │
│                       └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Código del Servicio de Idempotencia

**`idempotencia.service.ts`**

```typescript
@Injectable()
export class IdempotenciaService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  /**
   * Verifica si un mensaje ya fue procesado
   */
  async yaFueProcesado(claveIdempotencia: string): Promise<boolean> {
    const existe = await this.redisClient.exists(`idempotencia:${claveIdempotencia}`);
    return existe === 1;
  }

  /**
   * Obtiene el resultado cacheado
   */
  async obtenerResultadoCacheado(claveIdempotencia: string): Promise<any> {
    const resultado = await this.redisClient.get(`idempotencia:${claveIdempotencia}`);
    return resultado ? JSON.parse(resultado) : null;
  }

  /**
   * Marca un mensaje como procesado y cachea el resultado
   */
  async marcarComoProcesado(claveIdempotencia: string, resultado: any): Promise<void> {
    await this.redisClient.setEx(
      `idempotencia:${claveIdempotencia}`,
      86400, // TTL: 24 horas
      JSON.stringify(resultado)
    );
  }
}
```

### Código del Servicio de Reservas

**`reservas.service.ts`**

```typescript
async crearReserva(datos: CrearReservaDto, idempotenciaKey?: string): Promise<Reserva> {
  // 1. Generar clave única
  const clave = idempotenciaKey || uuidv4();
  
  // 2. Verificar si ya fue procesado
  const yaFueProcesado = await this.idempotenciaService.yaFueProcesado(clave);
  if (yaFueProcesado) {
    // CASO DUPLICADO: Retornar resultado cacheado
    const resultadoCacheado = await this.idempotenciaService.obtenerResultadoCacheado(clave);
    this.logger.warn(`🔁 Mensaje duplicado detectado: ${clave}`);
    return resultadoCacheado;
  }

  // 3. Validar cliente vía RabbitMQ
  const clienteValido = await this.validarClienteViaRabbitMQ(datos.clienteId);
  if (!clienteValido.existe) {
    throw new NotFoundException('Cliente no encontrado');
  }

  // 4. Crear reserva
  const nuevaReserva = this.reservaRepository.create({
    ...datos,
    idempotenciaKey: clave,
  });
  const reservaGuardada = await this.reservaRepository.save(nuevaReserva);
  
  // 5. Marcar como procesado en Redis
  await this.idempotenciaService.marcarComoProcesado(clave, reservaGuardada);
  
  this.logger.log(`✅ Reserva creada: ${reservaGuardada.id}`);
  return reservaGuardada;
}
```

---

## Flujo de Funcionamiento

### Caso 1: Primer Mensaje (Normal)

```
1. Cliente solicita crear reserva
2. Microservicio genera UUID: "abc-123-def"
3. Verifica Redis: GET idempotencia:abc-123-def → NULL
4. No existe, procede a procesar
5. Valida cliente vía RabbitMQ ✓
6. Guarda reserva en PostgreSQL ✓
7. Guarda en Redis: SET idempotencia:abc-123-def → {...resultado...} TTL:24h
8. Retorna resultado al cliente
9. Envía ACK a RabbitMQ ✓
```

### Caso 2: Mensaje Duplicado (Idempotencia)

```
1. RabbitMQ reenvía el mismo mensaje (fallo de red anterior)
2. Microservicio recibe mensaje con mismo UUID: "abc-123-def"
3. Verifica Redis: GET idempotencia:abc-123-def → EXISTE ✓
4. Obtiene resultado cacheado de Redis
5. Retorna resultado SIN procesar de nuevo
6. NO se crea reserva duplicada ✓
7. Envía ACK a RabbitMQ ✓
```

### Caso 3: Mensaje Diferente

```
1. Cliente solicita otra reserva diferente
2. Microservicio genera nuevo UUID: "xyz-789-uvw"
3. Verifica Redis: GET idempotencia:xyz-789-uvw → NULL
4. No existe, procede a procesar normalmente
5. ... (flujo normal como Caso 1)
```

---

## Casos de Uso

### 1. Fallo de Red Durante ACK

**Escenario:**
- Mensaje procesado exitosamente
- Reserva guardada en DB
- ACK no llega a RabbitMQ por fallo de red
- RabbitMQ reenvía el mensaje

**Con Idempotencia:**
```
✅ Redis detecta clave existente
✅ Retorna resultado cacheado
✅ NO se duplica la reserva
✅ Cliente recibe respuesta consistente
```

**Sin Idempotencia:**
```
❌ Procesa el mensaje de nuevo
❌ Crea reserva duplicada en DB
❌ Cliente tiene 2 reservas
```

### 2. Reinicio del Microservicio

**Escenario:**
- Microservicio recibe mensaje y comienza a procesar
- Microservicio se reinicia (deployment, crash)
- Mensaje no tiene ACK
- RabbitMQ lo reenvía al reiniciar

**Con Idempotencia:**
```
✅ Si el mensaje alcanzó a guardarse en Redis antes del crash
✅ Al reiniciar, detecta clave existente
✅ Retorna resultado cacheado
```

### 3. Retry del Cliente

**Escenario:**
- Usuario hace clic en "Reservar"
- Request demora (timeout en frontend)
- Usuario hace clic de nuevo
- 2 requests llegan al backend

**Con Idempotencia:**
```
✅ Primer request genera UUID y procesa
✅ Segundo request con mismo UUID detecta duplicado
✅ Solo se crea 1 reserva
```

---

## Pruebas y Validación

### Prueba 1: Envío Múltiple del Mismo Mensaje

```bash
# Enviar 3 veces el mismo request
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/reservas \
    -H "Content-Type: application/json" \
    -d '{
      "clienteId": 1,
      "servicioNombre": "Consulta",
      "fechaReserva": "2025-12-20T15:00:00Z",
      "duracionMinutos": 60
    }'
done

# Verificar en DB que solo existe 1 reserva
docker exec -it db-reservas psql -U admin -d reservas_db \
  -c "SELECT COUNT(*) FROM reservas WHERE cliente_id = 1 AND servicio_nombre = 'Consulta';"
```

**Resultado Esperado:** COUNT = 1

### Prueba 2: Verificación en Redis

```bash
# Conectar a Redis
docker exec -it redis redis-cli

# Ver todas las claves de idempotencia
> KEYS idempotencia:*
1) "idempotencia:a3f8b2c5-1234-5678-90ab-cdef12345678"

# Ver el contenido de una clave
> GET idempotencia:a3f8b2c5-1234-5678-90ab-cdef12345678
"{\"id\":1,\"clienteId\":1,\"servicioNombre\":\"Consulta\",...}"

# Ver el TTL (tiempo restante)
> TTL idempotencia:a3f8b2c5-1234-5678-90ab-cdef12345678
(integer) 86234  # Segundos restantes (~24 horas)
```

### Prueba 3: Simulación de Fallo de Red

```bash
# 1. Crear reserva
curl -X POST http://localhost:3000/api/reservas -d '{...}'

# 2. Inmediatamente reiniciar el microservicio
docker-compose restart microservicio-reservas

# 3. RabbitMQ reenviará el mensaje sin ACK

# 4. Ver logs del microservicio
docker-compose logs -f microservicio-reservas

# Buscar en logs:
# "⚠️  Mensaje duplicado detectado: a3f8b2c5-..."
# "📦 Retornando resultado cacheado para: a3f8b2c5-..."
```

### Prueba 4: Expiración del TTL

```bash
# 1. Crear reserva
curl -X POST http://localhost:3000/api/reservas -d '{...}'

# 2. Verificar que la clave existe
docker exec -it redis redis-cli GET idempotencia:<UUID>

# 3. Esperar 24 horas (o modificar TTL a 10 segundos para prueba rápida)

# 4. Verificar que la clave fue eliminada automáticamente
docker exec -it redis redis-cli GET idempotencia:<UUID>
(nil)  # Ya no existe
```

---

## Ventajas y Desventajas

### ✅ Ventajas

1. **Garantiza Exactly-Once Semantics**
   - A nivel de aplicación, el mensaje se procesa exactamente una vez
   - Elimina duplicados en base de datos

2. **Performance**
   - Redis es extremadamente rápido (operaciones en microsegundos)
   - Verificación de idempotencia es más rápida que consultar BD

3. **Resiliencia**
   - El sistema tolera fallos de red
   - Tolera reinicios de microservicios
   - Tolera retries del cliente

4. **Simplicidad**
   - Lógica centralizada en un servicio (`IdempotenciaService`)
   - Fácil de probar y mantener

5. **Escalabilidad**
   - Redis puede manejar millones de claves
   - TTL automático libera memoria

### ❌ Desventajas

1. **Dependencia de Redis**
   - Si Redis falla, el sistema puede procesar duplicados
   - Requiere monitoreo de Redis

2. **Memoria**
   - Cada mensaje procesado ocupa espacio en Redis
   - TTL de 24 horas puede acumular muchas claves

3. **Complejidad Adicional**
   - Requiere configurar y mantener Redis
   - Lógica adicional en el código

4. **Ventana de Tiempo**
   - Solo protege durante el TTL (24 horas)
   - Después del TTL, un mensaje antiguo podría duplicarse

### Alternativas

1. **Tabla de Deduplicación en BD**
   - Usar PostgreSQL en lugar de Redis
   - Más lento pero más durable

2. **Idempotencia Natural**
   - Diseñar operaciones que sean naturalmente idempotentes
   - Ej: `UPDATE reservas SET estado = 'confirmada' WHERE id = 1`

3. **Distributed Lock (Redlock)**
   - Usar locks distribuidos para sincronizar
   - Más complejo, mayor latencia

---

## Mejoras Futuras

### 1. Persistencia de Redis

Configurar Redis con AOF o RDB para persistencia:

```yaml
redis:
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
```

### 2. Clúster de Redis

Para alta disponibilidad:

```yaml
redis-cluster:
  replicas: 3
  sentinel: true
```

### 3. Métricas y Monitoreo

```typescript
// Agregar métricas
this.metricsService.incrementCounter('idempotencia.verificaciones');
this.metricsService.incrementCounter('idempotencia.duplicados');
```

### 4. TTL Configurable por Tipo de Mensaje

```typescript
const ttl = mensaje.tipo === 'pago' ? 86400 * 7 : 86400; // Pagos: 7 días
```

---

## Referencias

### Artículos y Documentación

- [Enterprise Integration Patterns - Idempotent Receiver](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)
- [Stripe API Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/reliability.html)
- [Redis Documentation](https://redis.io/docs/)

### Patrones Relacionados

- **At-Least-Once Delivery**: Garantía de RabbitMQ
- **Exactly-Once Semantics**: Objetivo de la idempotencia
- **Request-Reply Pattern**: Usado para validar clientes
- **Saga Pattern**: Para transacciones distribuidas

### Librerías Útiles

- `redis`: Cliente oficial de Redis para Node.js
- `uuid`: Generación de UUIDs
- `@nestjs/microservices`: Integración con RabbitMQ

---

## Conclusión

La estrategia **Idempotent Consumer** es esencial en arquitecturas de microservicios modernas. Aunque añade complejidad (dependencia de Redis, lógica adicional), los beneficios superan ampliamente las desventajas:

✅ **Elimina duplicados**
✅ **Mejora la experiencia del usuario**
✅ **Previene pérdidas financieras**
✅ **Hace el sistema más robusto**

Para el caso específico de nuestro sistema de reservas, la idempotencia garantiza que:
- Un cliente nunca tendrá reservas duplicadas
- Los reintentos del usuario no causan problemas
- Los fallos de red son manejados correctamente
- El sistema es predecible y confiable

**Implementación en Producción:**
- ✅ Usar Redis en modo cluster para alta disponibilidad
- ✅ Monitorear métricas de duplicados
- ✅ Configurar alertas si Redis falla
- ✅ Documentar el comportamiento para el equipo

---

**Autor:** Sistema de Microservicios - Clientes y Reservas
**Fecha:** Diciembre 2025
**Versión:** 1.0
