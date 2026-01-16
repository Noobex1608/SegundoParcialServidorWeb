# 📘 Backend Reservas - Documentación Técnica

## 🎯 Propósito

El **Backend Reservas** es un microservicio que gestiona todas las reservas del sistema. Representa la **Entidad Movimiento** del modelo de datos, registrando transacciones que hacen referencia a la entidad maestro (Clientes). Implementa validación de disponibilidad y el patrón **Idempotent Consumer** usando Redis.

---

## 🏗️ Arquitectura

```
API Gateway / MCP Server
         ↓ REST HTTP
    Backend Reservas
    ├── Controllers (Endpoints REST)
    ├── Services (Lógica de negocio)
    ├── Entities (Modelo de datos)
    ├── Idempotencia (Patrón Idempotent Consumer)
    ├── Database (SQLite)
    │   └── reservas.db
    └── Cache (Redis)
         └── Prevención de duplicados
```

### Ubicación en el Proyecto
- **Carpeta:** `apps/backend/reservas/`
- **Puerto:** `3003`
- **Tecnologías:** NestJS, TypeORM, SQLite, Redis, Axios

---

## 📁 Estructura del Código

```
backend/reservas/
├── src/
│   ├── main.ts                           # Punto de entrada
│   ├── app.module.ts                     # Módulo raíz
│   │
│   ├── reservas/                         # Módulo de reservas
│   │   ├── reservas.controller.ts        # Controlador REST
│   │   ├── reservas.service.ts           # Lógica de negocio
│   │   ├── reservas.module.ts            # Configuración del módulo
│   │   │
│   │   ├── entidades/
│   │   │   └── reserva.entidad.ts        # Modelo de datos
│   │   │
│   │   └── dto/
│   │       └── crear-reserva.dto.ts      # DTO para crear
│   │
│   ├── idempotencia/                     # Patrón Idempotent Consumer
│   │   ├── idempotencia.service.ts       # Servicio con Redis
│   │   └── idempotencia.module.ts        # Configuración
│   │
│   └── database/
│       └── database.module.ts            # Configuración de BD
│
├── data/
│   └── reservas.db                       # Base de datos SQLite
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 🔧 Componentes Principales

### 1. **Reserva Entity** - Modelo de Datos

**Ubicación:** `src/reservas/entidades/reserva.entidad.ts`

**Función:** Define la estructura de la tabla de reservas en la base de datos.

#### Esquema de la Tabla

```typescript
export enum EstadoReserva {
  PENDIENTE = 'pendiente',
  CONFIRMADA = 'confirmada',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada'
}

@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number;                           // ID único autogenerado
  
  @Column()
  clienteId: number;                    // FK a microservicio Clientes
  
  @Column({ length: 100 })
  servicioNombre: string;               // Nombre del servicio reservado
  
  @Column()
  fechaReserva: Date;                   // Fecha y hora de la reserva
  
  @Column({ default: 60 })
  duracionMinutos: number;              // Duración en minutos
  
  @Column({
    type: 'text',
    enum: EstadoReserva,
    default: EstadoReserva.CONFIRMADA
  })
  estado: EstadoReserva;                // Estado actual
  
  @Column({ nullable: true, length: 500 })
  notas: string;                        // Notas adicionales
  
  @Column({ unique: true })
  idempotenciaKey: string;              // Clave para idempotencia
  
  @CreateDateColumn()
  fechaCreacion: Date;                  // Timestamp de creación
  
  @UpdateDateColumn()
  fechaActualizacion: Date;             // Última modificación
  
  @Column({ nullable: true })
  fechaCancelacion: Date;               // Soft delete
}
```

#### Características de la Entidad

**Relación con Clientes:**
- `clienteId`: Referencia al ID del cliente en el microservicio de Clientes
- No usa Foreign Key tradicional (arquitectura de microservicios)
- Validación se hace vía HTTP al crear la reserva

**Estados de Reserva:**
- **PENDIENTE:** Reserva creada pero no confirmada
- **CONFIRMADA:** Reserva activa y confirmada (estado inicial)
- **COMPLETADA:** Servicio ya fue realizado
- **CANCELADA:** Reserva cancelada (soft delete)

**Idempotencia:**
- `idempotenciaKey`: Clave única para prevenir duplicados
- Se genera con UUID v4 o se recibe del cliente
- Almacenada en Redis para verificación rápida

---

### 2. **Reservas Service** - Lógica de Negocio

**Ubicación:** `src/reservas/reservas.service.ts`

**Función:** Implementar toda la lógica de negocio relacionada con reservas.

#### Métodos Principales

**a) Crear Reserva (con Idempotencia)**

```typescript
async crearReserva(
  crearReservaDto: CrearReservaDto, 
  idempotenciaKey?: string
): Promise<Reserva> {
  // 1. Generar o usar clave de idempotencia
  const claveIdempotencia = idempotenciaKey || uuidv4();
  
  // 2. VERIFICAR SI YA FUE PROCESADO (Idempotencia)
  const yaFueProcesado = await this.idempotenciaService.yaFueProcesado(
    claveIdempotencia
  );
  
  if (yaFueProcesado) {
    const resultadoCacheado = await this.idempotenciaService
      .obtenerResultadoCacheado(claveIdempotencia);
    
    if (resultadoCacheado) {
      this.logger.warn(
        `🔁 Mensaje duplicado ignorado. Retornando resultado cacheado: ${claveIdempotencia}`
      );
      return resultadoCacheado;
    }
  }
  
  // 3. Validar que la fecha de reserva sea futura
  const fechaReserva = new Date(crearReservaDto.fechaReserva);
  if (fechaReserva <= new Date()) {
    throw new BadRequestException('La fecha de reserva debe ser futura');
  }
  
  // 4. VALIDAR CLIENTE VÍA HTTP
  this.logger.log(`📤 Validando cliente ${crearReservaDto.clienteId} vía HTTP`);
  
  try {
    const clientesHost = process.env.MICROSERVICIO_CLIENTES_HOST || 'localhost';
    const clientesPort = process.env.MICROSERVICIO_CLIENTES_PORT || '3002';
    const clienteUrl = `http://${clientesHost}:${clientesPort}/clientes/${crearReservaDto.clienteId}`;
    
    const response = await firstValueFrom(
      this.httpService.get(clienteUrl)
    );
    
    const cliente = response.data;
    
    if (!cliente || !cliente.activo) {
      throw new BadRequestException(
        `El cliente con ID ${crearReservaDto.clienteId} no existe o no está activo`
      );
    }
    
    this.logger.log(`✅ Cliente validado: ${cliente.nombre}`);
  } catch (error) {
    this.logger.error(`❌ Error al validar cliente: ${error.message}`);
    throw new BadRequestException(
      `No se pudo validar el cliente con ID ${crearReservaDto.clienteId}`
    );
  }
  
  // 5. Crear la reserva
  const nuevaReserva = this.reservaRepository.create({
    ...crearReservaDto,
    fechaReserva,
    idempotenciaKey: claveIdempotencia,
    estado: EstadoReserva.CONFIRMADA,
    duracionMinutos: crearReservaDto.duracionMinutos || 60
  });
  
  const reservaGuardada = await this.reservaRepository.save(nuevaReserva);
  
  // 6. MARCAR COMO PROCESADO EN REDIS (Idempotencia)
  await this.idempotenciaService.marcarComoProcesado(
    claveIdempotencia,
    reservaGuardada
  );
  
  this.logger.log(
    `✅ Reserva creada: ${reservaGuardada.id} para cliente ${reservaGuardada.clienteId}`
  );
  
  return reservaGuardada;
}
```

**Flujo de Idempotencia:**
```
1. Recibe request con/sin idempotenciaKey
            ↓
2. Genera UUID si no hay key
            ↓
3. Verifica en Redis si ya fue procesado
            ↓
4. Si existe en Redis → retorna resultado cacheado (sin ejecutar nada)
            ↓
5. Si no existe → procesa normalmente
            ↓
6. Guarda resultado en Redis con TTL de 24 horas
            ↓
7. Retorna reserva creada
```

**Validaciones:**
- ✓ Cliente existe y está activo (vía HTTP)
- ✓ Fecha es futura
- ✓ No es un mensaje duplicado (idempotencia)

**b) Validar Disponibilidad**

```typescript
async validarDisponibilidad(
  fecha: Date
): Promise<{ disponible: boolean; reservasExistentes: number }> {
  // 1. Definir rango del día completo
  const inicioDelDia = new Date(fecha);
  inicioDelDia.setHours(0, 0, 0, 0);
  
  const finDelDia = new Date(fecha);
  finDelDia.setHours(23, 59, 59, 999);
  
  // 2. Contar reservas en ese día
  const reservasEnFecha = await this.reservaRepository
    .createQueryBuilder('reserva')
    .where('reserva.fechaReserva >= :inicio', { inicio: inicioDelDia })
    .andWhere('reserva.fechaReserva <= :fin', { fin: finDelDia })
    .andWhere('reserva.fechaCancelacion IS NULL')
    .andWhere('reserva.estado != :cancelada', { cancelada: EstadoReserva.CANCELADA })
    .getCount();
  
  // 3. Consideramos disponibilidad si hay menos de 10 reservas en el día
  const disponible = reservasEnFecha < 10;
  
  return {
    disponible,
    reservasExistentes: reservasEnFecha
  };
}
```

**Lógica de Disponibilidad:**
- Se cuenta cuántas reservas activas hay en el día completo
- Límite configurable: máximo 10 reservas por día
- No considera horarios específicos (simplificación)
- No cuenta reservas canceladas

**Posible Mejora:** Validar horarios específicos con duración de cada reserva para evitar solapamientos.

**c) Obtener Todas las Reservas**

```typescript
async obtenerTodasLasReservas(): Promise<Reserva[]> {
  return await this.reservaRepository.find({
    where: { fechaCancelacion: IsNull() },  // Solo activas
    order: { fechaReserva: 'ASC' }          // Próximas primero
  });
}
```

**d) Obtener Reserva por ID**

```typescript
async obtenerReservaPorId(id: number): Promise<Reserva> {
  const reserva = await this.reservaRepository.findOne({
    where: { id, fechaCancelacion: IsNull() }
  });
  
  if (!reserva) {
    throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
  }
  
  return reserva;
}
```

**e) Obtener Reservas por Cliente**

```typescript
async obtenerReservasPorCliente(clienteId: number): Promise<Reserva[]> {
  return await this.reservaRepository.find({
    where: { clienteId, fechaCancelacion: IsNull() },
    order: { fechaReserva: 'ASC' }
  });
}
```

**f) Cancelar Reserva (Soft Delete)**

```typescript
async cancelarReserva(id: number): Promise<{ mensaje: string }> {
  const reserva = await this.obtenerReservaPorId(id);
  
  // Validaciones de estado
  if (reserva.estado === EstadoReserva.CANCELADA) {
    throw new BadRequestException('La reserva ya está cancelada');
  }
  
  if (reserva.estado === EstadoReserva.COMPLETADA) {
    throw new BadRequestException(
      'No se puede cancelar una reserva completada'
    );
  }
  
  // Cancelar
  reserva.estado = EstadoReserva.CANCELADA;
  reserva.fechaCancelacion = new Date();
  await this.reservaRepository.save(reserva);
  
  this.logger.log(`❌ Reserva cancelada: ${reserva.id}`);
  return { mensaje: `Reserva ${reserva.id} cancelada exitosamente` };
}
```

**Validaciones de Cancelación:**
- ✓ No se puede cancelar una reserva ya cancelada
- ✓ No se puede cancelar una reserva completada
- ✓ Usa soft delete (no se borra físicamente)

---

### 3. **Idempotencia Service** - Patrón Idempotent Consumer

**Ubicación:** `src/idempotencia/idempotencia.service.ts`

**Función:** Prevenir procesamiento duplicado de mensajes usando Redis.

#### ¿Por qué Idempotencia?

**Problema:**
En sistemas distribuidos, un mensaje puede llegar múltiples veces por:
- Reintentos de red
- Reintentos del cliente
- Fallos parciales
- Duplicación en mensajería

**Solución:**
Implementar el patrón **Idempotent Consumer** que garantiza que procesar el mismo mensaje N veces produce el mismo resultado que procesarlo 1 vez.

#### Implementación

**a) Verificar si ya fue procesado**

```typescript
async yaFueProcesado(claveIdempotencia: string): Promise<boolean> {
  try {
    const resultado = await this.redis.get(`idempotencia:${claveIdempotencia}`);
    return resultado !== null;
  } catch (error) {
    this.logger.error(`Error verificando idempotencia: ${error.message}`);
    return false;  // En caso de error, permitir procesamiento
  }
}
```

**b) Marcar como procesado**

```typescript
async marcarComoProcesado(
  claveIdempotencia: string,
  resultado: any
): Promise<void> {
  try {
    const TTL = 86400;  // 24 horas
    
    await this.redis.setex(
      `idempotencia:${claveIdempotencia}`,
      TTL,
      JSON.stringify(resultado)
    );
    
    this.logger.log(
      `✅ Clave de idempotencia guardada: ${claveIdempotencia} (TTL: ${TTL}s)`
    );
  } catch (error) {
    this.logger.error(`Error guardando idempotencia: ${error.message}`);
  }
}
```

**c) Obtener resultado cacheado**

```typescript
async obtenerResultadoCacheado(claveIdempotencia: string): Promise<any> {
  try {
    const resultado = await this.redis.get(`idempotencia:${claveIdempotencia}`);
    return resultado ? JSON.parse(resultado) : null;
  } catch (error) {
    this.logger.error(`Error obteniendo resultado cacheado: ${error.message}`);
    return null;
  }
}
```

#### Configuración de Redis

```typescript
constructor() {
  this.redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });
  
  this.redis.on('connect', () => {
    this.logger.log('✅ Conectado a Redis para idempotencia');
  });
  
  this.redis.on('error', (error) => {
    this.logger.error(`❌ Error de conexión a Redis: ${error.message}`);
  });
}
```

#### Ejemplo de Uso

**Primera llamada (procesamiento normal):**
```
POST /reservas
{ 
  "clienteId": 1,
  "servicioNombre": "Corte",
  "fechaReserva": "2026-01-30T10:00:00Z"
}
Header: X-Idempotency-Key: abc-123

→ No existe en Redis
→ Procesa normalmente
→ Crea reserva ID 5
→ Guarda en Redis: idempotencia:abc-123 → reserva 5
→ Retorna: { "id": 5, ... }
```

**Segunda llamada (mensaje duplicado):**
```
POST /reservas
{ 
  "clienteId": 1,
  "servicioNombre": "Corte",
  "fechaReserva": "2026-01-30T10:00:00Z"
}
Header: X-Idempotency-Key: abc-123

→ Existe en Redis
→ No procesa
→ Obtiene de Redis: reserva 5
→ Retorna: { "id": 5, ... }  (mismo resultado)
```

---

### 4. **Reservas Controller** - Endpoints REST

**Ubicación:** `src/reservas/reservas.controller.ts`

**Función:** Exponer endpoints HTTP para operaciones con reservas.

#### Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reservas` | Listar todas las reservas |
| POST | `/reservas` | Crear una nueva reserva |
| GET | `/reservas/:id` | Obtener reserva por ID |
| GET | `/reservas/cliente/:clienteId` | Reservas de un cliente |
| POST | `/reservas/validar-disponibilidad` | Validar fecha |
| PATCH | `/reservas/:id/cancelar` | Cancelar reserva |

#### Implementación de Endpoints

**a) Crear Reserva**

```typescript
@Post()
async crear(
  @Body() crearReservaDto: CrearReservaDto,
  @Headers('x-idempotency-key') idempotenciaKey?: string
): Promise<Reserva> {
  return await this.reservasService.crearReserva(
    crearReservaDto,
    idempotenciaKey
  );
}
```

**Request:**
```bash
POST http://localhost:3003/reservas
Content-Type: application/json
X-Idempotency-Key: abc-123-def-456

{
  "clienteId": 1,
  "servicioNombre": "Corte de cabello",
  "fechaReserva": "2026-01-30T10:00:00Z",
  "duracionMinutos": 60,
  "notas": "Cliente prefiere estilista principal"
}
```

**Response:**
```json
{
  "id": 5,
  "clienteId": 1,
  "servicioNombre": "Corte de cabello",
  "fechaReserva": "2026-01-30T10:00:00.000Z",
  "duracionMinutos": 60,
  "estado": "confirmada",
  "notas": "Cliente prefiere estilista principal",
  "idempotenciaKey": "abc-123-def-456",
  "fechaCreacion": "2026-01-05T11:00:00.000Z",
  "fechaActualizacion": "2026-01-05T11:00:00.000Z",
  "fechaCancelacion": null
}
```

**b) Validar Disponibilidad**

```typescript
@Post('validar-disponibilidad')
async validarDisponibilidad(
  @Body() body: { fechaReserva: string; duracionMinutos?: number }
): Promise<any> {
  const fecha = new Date(body.fechaReserva);
  const resultado = await this.reservasService.validarDisponibilidad(fecha);
  
  return {
    ...resultado,
    fecha: body.fechaReserva,
    mensaje: resultado.disponible 
      ? 'Fecha disponible' 
      : 'Fecha no disponible'
  };
}
```

**Request:**
```bash
POST http://localhost:3003/reservas/validar-disponibilidad
Content-Type: application/json

{
  "fechaReserva": "2026-01-30T10:00:00Z",
  "duracionMinutos": 60
}
```

**Response (Disponible):**
```json
{
  "disponible": true,
  "reservasExistentes": 3,
  "fecha": "2026-01-30T10:00:00Z",
  "mensaje": "Fecha disponible"
}
```

**Response (No Disponible):**
```json
{
  "disponible": false,
  "reservasExistentes": 10,
  "fecha": "2026-01-30T10:00:00Z",
  "mensaje": "Fecha no disponible"
}
```

**c) Obtener por Cliente**

```typescript
@Get('cliente/:clienteId')
async obtenerPorCliente(
  @Param('clienteId') clienteId: number
): Promise<Reserva[]> {
  return await this.reservasService.obtenerReservasPorCliente(clienteId);
}
```

**Request:**
```bash
GET http://localhost:3003/reservas/cliente/1
```

**d) Cancelar Reserva**

```typescript
@Patch(':id/cancelar')
async cancelar(@Param('id') id: number): Promise<{ mensaje: string }> {
  return await this.reservasService.cancelarReserva(id);
}
```

**Request:**
```bash
PATCH http://localhost:3003/reservas/5/cancelar
```

---

### 5. **DTO** - Validación de Datos

#### CrearReservaDto

**Ubicación:** `src/reservas/dto/crear-reserva.dto.ts`

```typescript
export class CrearReservaDto {
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio' })
  @IsNumber()
  clienteId: number;
  
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  @IsString()
  @MaxLength(100)
  servicioNombre: string;
  
  @IsNotEmpty({ message: 'La fecha de reserva es obligatoria' })
  @IsString()
  fechaReserva: string;  // ISO 8601
  
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  duracionMinutos?: number;  // Entre 15 min y 8 horas
  
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
```

---

## 🗄️ Base de Datos

### Ubicación Física
- **Archivo:** `apps/backend/reservas/data/reservas.db`
- **Tipo:** SQLite
- **Persistencia:** Montado como volumen en Docker

### Esquema de la Tabla `reservas`

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| clienteId | INTEGER | NOT NULL |
| servicioNombre | VARCHAR(100) | NOT NULL |
| fechaReserva | DATETIME | NOT NULL |
| duracionMinutos | INTEGER | DEFAULT 60 |
| estado | VARCHAR(20) | DEFAULT 'confirmada' |
| notas | VARCHAR(500) | NULL |
| idempotenciaKey | VARCHAR(255) | UNIQUE, NOT NULL |
| fechaCreacion | DATETIME | NOT NULL |
| fechaActualizacion | DATETIME | NOT NULL |
| fechaCancelacion | DATETIME | NULL |

---

## ⚙️ Variables de Entorno

```env
# Puerto del servicio
PORT=3003
NODE_ENV=development

# Microservicio de Clientes
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002

# Redis para Idempotencia
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## 🔄 Flujo Completo: Crear Reserva

```
1. Request HTTP con header de idempotencia
   POST /reservas
   X-Idempotency-Key: abc-123
            ↓
2. Controller extrae key y delega
   reservasService.crearReserva(dto, "abc-123")
            ↓
3. Service verifica en Redis
   Redis GET idempotencia:abc-123
            ↓
4a. Si existe en Redis → retorna cacheado (FIN)
            ↓
4b. Si no existe → continuar
            ↓
5. Validar fecha es futura
   new Date(dto.fechaReserva) > now()
            ↓
6. Validar cliente vía HTTP
   HTTP GET http://backend-clientes:3002/clientes/1
            ↓
7. Backend Clientes retorna datos
   { "id": 1, "nombre": "Juan", "activo": true }
            ↓
8. Crear reserva en SQLite
   INSERT INTO reservas (...)
            ↓
9. Guardar en Redis (24h TTL)
   Redis SETEX idempotencia:abc-123 86400 {reserva}
            ↓
10. Retornar reserva al cliente
    HTTP 200 { "id": 5, ... }
```

---

## 🐛 Logs y Debugging

```
🌐 Microservicio de Reservas iniciado
📍 URL: http://localhost:3003
✅ Conectado a Redis para idempotencia

📤 Validando cliente 1 vía HTTP
✅ Cliente validado: Juan Pérez
✅ Reserva creada: 5 para cliente 1
✅ Clave de idempotencia guardada: abc-123 (TTL: 86400s)

🔁 Mensaje duplicado ignorado. Retornando resultado cacheado: abc-123

❌ Reserva cancelada: 5
```

---

## 🧪 Pruebas con cURL

### Crear Reserva
```bash
curl -X POST http://localhost:3003/reservas \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2026-01-30T10:00:00Z",
    "duracionMinutos": 60
  }'
```

### Validar Disponibilidad
```bash
curl -X POST http://localhost:3003/reservas/validar-disponibilidad \
  -H "Content-Type: application/json" \
  -d '{
    "fechaReserva": "2026-01-30T10:00:00Z"
  }'
```

### Obtener Reservas de Cliente
```bash
curl http://localhost:3003/reservas/cliente/1
```

### Cancelar Reserva
```bash
curl -X PATCH http://localhost:3003/reservas/5/cancelar
```

---

## ❗ Manejo de Errores

### Error: Cliente no válido
```json
{
  "statusCode": 400,
  "message": "El cliente con ID 99 no existe o no está activo",
  "error": "Bad Request"
}
```

### Error: Fecha pasada
```json
{
  "statusCode": 400,
  "message": "La fecha de reserva debe ser futura",
  "error": "Bad Request"
}
```

### Error: Reserva ya cancelada
```json
{
  "statusCode": 400,
  "message": "La reserva ya está cancelada",
  "error": "Bad Request"
}
```

---

## 📊 Características del Microservicio

✅ **Validación de Cliente:** Verifica existencia vía HTTP  
✅ **Idempotent Consumer:** Previene procesamiento duplicado con Redis  
✅ **Validación de Disponibilidad:** Verifica conflictos de horarios  
✅ **Soft Delete:** Cancelación sin pérdida de datos  
✅ **Estados de Reserva:** Ciclo de vida completo  
✅ **Timestamps Automáticos:** Auditoría de cambios  
✅ **SQLite:** Base de datos liviana  
✅ **Logs Detallados:** Trazabilidad completa  

---

## 🔮 Posibles Mejoras

- Validación de horarios específicos (evitar solapamientos exactos)
- Notificaciones por email/SMS al crear/cancelar
- Recordatorios automáticos antes de la fecha
- Sistema de pagos integrado
- Gestión de recursos (salas, empleados)
- Reportes y estadísticas
- Integración con calendario (iCal, Google Calendar)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Autor:** Sistema de Reservas MCP + Gemini

