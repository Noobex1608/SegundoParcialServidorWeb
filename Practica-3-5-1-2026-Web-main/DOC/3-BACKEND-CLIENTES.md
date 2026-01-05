# 📘 Backend Clientes - Documentación Técnica

## 🎯 Propósito

El **Backend Clientes** es un microservicio que gestiona toda la información relacionada con los clientes del sistema. Representa la **Entidad Maestro** del modelo de datos, almacenando información fundamental que es referenciada por otros servicios (como Reservas).

---

## 🏗️ Arquitectura

```
API Gateway / MCP Server
         ↓ REST HTTP
    Backend Clientes
    ├── Controllers (Endpoints REST)
    ├── Services (Lógica de negocio)
    ├── Entities (Modelo de datos)
    └── Database (SQLite)
         └── clientes.db
```

### Ubicación en el Proyecto
- **Carpeta:** `apps/backend/clientes/`
- **Puerto:** `3002`
- **Tecnologías:** NestJS, TypeORM, SQLite

---

## 📁 Estructura del Código

```
backend/clientes/
├── src/
│   ├── main.ts                           # Punto de entrada
│   ├── app.module.ts                     # Módulo raíz
│   │
│   ├── clientes/                         # Módulo de clientes
│   │   ├── clientes.controller.ts        # Controlador REST
│   │   ├── clientes.service.ts           # Lógica de negocio
│   │   ├── clientes.module.ts            # Configuración del módulo
│   │   │
│   │   ├── entidades/
│   │   │   └── cliente.entidad.ts        # Modelo de datos
│   │   │
│   │   └── dto/
│   │       ├── crear-cliente.dto.ts      # DTO para crear
│   │       └── actualizar-cliente.dto.ts # DTO para actualizar
│   │
│   └── database/
│       └── database.module.ts            # Configuración de BD
│
├── data/
│   └── clientes.db                       # Base de datos SQLite
│
├── dist/                                 # Código compilado
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 🔧 Componentes Principales

### 1. **Cliente Entity** - Modelo de Datos

**Ubicación:** `src/clientes/entidades/cliente.entidad.ts`

**Función:** Define la estructura de la tabla de clientes en la base de datos.

#### Esquema de la Tabla

```typescript
@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;                    // ID único autogenerado
  
  @Column({ length: 100 })
  nombre: string;                // Nombre completo del cliente
  
  @Column({ unique: true, length: 100 })
  email: string;                 // Email único
  
  @Column({ length: 20 })
  telefono: string;              // Teléfono de contacto
  
  @Column({ default: true })
  activo: boolean;               // Estado del cliente
  
  @CreateDateColumn()
  fechaCreacion: Date;           // Fecha de registro
  
  @UpdateDateColumn()
  fechaActualizacion: Date;      // Última modificación
  
  @Column({ nullable: true })
  fechaEliminacion: Date;        // Soft delete
}
```

#### Características de la Entidad

**Campos Obligatorios:**
- `nombre`: Nombre del cliente (max 100 caracteres)
- `email`: Email único en el sistema (max 100 caracteres)
- `telefono`: Número de teléfono (max 20 caracteres)

**Campos Automáticos:**
- `id`: Generado automáticamente por la base de datos
- `fechaCreacion`: Timestamp de creación automático
- `fechaActualizacion`: Se actualiza automáticamente en cada cambio
- `activo`: Por defecto `true`

**Soft Delete:**
- `fechaEliminacion`: Cuando se "elimina" un cliente, no se borra físicamente, solo se marca con esta fecha

---

### 2. **Clientes Service** - Lógica de Negocio

**Ubicación:** `src/clientes/clientes.service.ts`

**Función:** Implementar toda la lógica de negocio relacionada con clientes.

#### Métodos Principales

**a) Crear Cliente**

```typescript
async crearCliente(crearClienteDto: CrearClienteDto): Promise<Cliente> {
  // 1. Verificar si el email ya existe
  const clienteExistente = await this.clienteRepository.findOne({
    where: { email: crearClienteDto.email }
  });
  
  if (clienteExistente) {
    throw new ConflictException(
      `Ya existe un cliente con el email ${crearClienteDto.email}`
    );
  }
  
  // 2. Crear y guardar el nuevo cliente
  const nuevoCliente = this.clienteRepository.create(crearClienteDto);
  const clienteGuardado = await this.clienteRepository.save(nuevoCliente);
  
  this.logger.log(`Cliente creado: ${clienteGuardado.id} - ${clienteGuardado.nombre}`);
  return clienteGuardado;
}
```

**Validaciones:**
- ✓ Email único en el sistema
- ✓ Campos obligatorios presentes (validado por DTO)

**b) Obtener Todos los Clientes**

```typescript
async obtenerTodosLosClientes(): Promise<Cliente[]> {
  return await this.clienteRepository.find({
    where: { fechaEliminacion: IsNull() },  // Solo clientes activos
    order: { fechaCreacion: 'DESC' }        // Más recientes primero
  });
}
```

**Características:**
- Solo retorna clientes no eliminados (soft delete)
- Ordenados por fecha de creación descendente

**c) Obtener Cliente por ID**

```typescript
async obtenerClientePorId(id: number): Promise<Cliente> {
  const cliente = await this.clienteRepository.findOne({
    where: { id, fechaEliminacion: IsNull() }
  });
  
  if (!cliente) {
    throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
  }
  
  return cliente;
}
```

**d) Buscar por Email**

```typescript
async buscarPorEmail(email: string): Promise<Cliente> {
  const cliente = await this.clienteRepository.findOne({
    where: { email, fechaEliminacion: IsNull() }
  });
  
  if (!cliente) {
    throw new NotFoundException(`Cliente con email ${email} no encontrado`);
  }
  
  return cliente;
}
```

**e) Buscar por Nombre (Búsqueda Parcial)**

```typescript
async buscarPorNombre(nombre: string): Promise<Cliente[]> {
  const clientes = await this.clienteRepository.find({
    where: { 
      nombre: Like(`%${nombre}%`),         // Búsqueda parcial
      fechaEliminacion: IsNull() 
    },
    order: { fechaCreacion: 'DESC' }
  });
  
  return clientes;
}
```

**Características:**
- Búsqueda parcial: "Juan" encuentra "Juan Pérez", "María Juan", etc.
- Retorna array (puede ser vacío si no hay coincidencias)
- No lanza excepción si no encuentra resultados

**f) Actualizar Cliente**

```typescript
async actualizarCliente(
  id: number, 
  actualizarClienteDto: ActualizarClienteDto
): Promise<Cliente> {
  // 1. Verificar que el cliente existe
  const cliente = await this.obtenerClientePorId(id);
  
  // 2. Si se actualiza el email, verificar que sea único
  if (actualizarClienteDto.email && 
      actualizarClienteDto.email !== cliente.email) {
    const emailExistente = await this.clienteRepository.findOne({
      where: { email: actualizarClienteDto.email }
    });
    
    if (emailExistente) {
      throw new ConflictException(
        `Ya existe un cliente con el email ${actualizarClienteDto.email}`
      );
    }
  }
  
  // 3. Actualizar y guardar
  Object.assign(cliente, actualizarClienteDto);
  const clienteActualizado = await this.clienteRepository.save(cliente);
  
  this.logger.log(`Cliente actualizado: ${clienteActualizado.id}`);
  return clienteActualizado;
}
```

**Validaciones:**
- ✓ Cliente existe
- ✓ Si cambia email, verificar que sea único
- ✓ Actualización automática de `fechaActualizacion`

**g) Eliminar Cliente (Soft Delete)**

```typescript
async eliminarCliente(id: number): Promise<{ mensaje: string }> {
  // 1. Obtener el cliente
  const cliente = await this.obtenerClientePorId(id);
  
  // 2. Marcar como eliminado
  cliente.fechaEliminacion = new Date();
  cliente.activo = false;
  await this.clienteRepository.save(cliente);
  
  this.logger.log(`Cliente eliminado (soft delete): ${cliente.id}`);
  return { mensaje: `Cliente ${cliente.nombre} eliminado exitosamente` };
}
```

**Soft Delete vs Hard Delete:**
- **Soft Delete:** No se borra de la BD, solo se marca con fecha de eliminación
- **Ventajas:** Mantiene integridad referencial, permite auditoría, recuperación posible
- **Implementación:** Campo `fechaEliminacion` y filtro `IsNull()` en todas las consultas

---

### 3. **Clientes Controller** - Endpoints REST

**Ubicación:** `src/clientes/clientes.controller.ts`

**Función:** Exponer endpoints HTTP para operaciones CRUD.

#### Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/clientes` | Listar todos los clientes |
| POST | `/clientes` | Crear un nuevo cliente |
| GET | `/clientes/:id` | Obtener cliente por ID |
| GET | `/clientes/buscar/email/:email` | Buscar por email |
| GET | `/clientes/buscar/nombre/:nombre` | Buscar por nombre |
| PATCH | `/clientes/:id` | Actualizar cliente |
| DELETE | `/clientes/:id` | Eliminar cliente (soft) |

#### Implementación de Endpoints

**a) Listar Todos**

```typescript
@Get()
async obtenerTodos(): Promise<Cliente[]> {
  return await this.clientesService.obtenerTodosLosClientes();
}
```

**Request:**
```bash
GET http://localhost:3002/clientes
```

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "123456789",
    "activo": true,
    "fechaCreacion": "2026-01-05T10:00:00.000Z",
    "fechaActualizacion": "2026-01-05T10:00:00.000Z",
    "fechaEliminacion": null
  }
]
```

**b) Crear Cliente**

```typescript
@Post()
async crear(@Body() crearClienteDto: CrearClienteDto): Promise<Cliente> {
  return await this.clientesService.crearCliente(crearClienteDto);
}
```

**Request:**
```bash
POST http://localhost:3002/clientes
Content-Type: application/json

{
  "nombre": "María López",
  "email": "maria@ejemplo.com",
  "telefono": "987654321"
}
```

**Response:**
```json
{
  "id": 2,
  "nombre": "María López",
  "email": "maria@ejemplo.com",
  "telefono": "987654321",
  "activo": true,
  "fechaCreacion": "2026-01-05T11:00:00.000Z",
  "fechaActualizacion": "2026-01-05T11:00:00.000Z",
  "fechaEliminacion": null
}
```

**c) Obtener por ID**

```typescript
@Get(':id')
async obtenerPorId(@Param('id') id: number): Promise<Cliente> {
  return await this.clientesService.obtenerClientePorId(id);
}
```

**Request:**
```bash
GET http://localhost:3002/clientes/1
```

**d) Buscar por Email**

```typescript
@Get('buscar/email/:email')
async buscarPorEmail(@Param('email') email: string): Promise<Cliente> {
  return await this.clientesService.buscarPorEmail(email);
}
```

**Request:**
```bash
GET http://localhost:3002/clientes/buscar/email/juan@ejemplo.com
```

**e) Buscar por Nombre**

```typescript
@Get('buscar/nombre/:nombre')
async buscarPorNombre(@Param('nombre') nombre: string): Promise<Cliente[]> {
  return await this.clientesService.buscarPorNombre(nombre);
}
```

**Request:**
```bash
GET http://localhost:3002/clientes/buscar/nombre/Juan
```

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    ...
  },
  {
    "id": 5,
    "nombre": "Juan Carlos",
    "email": "juanc@ejemplo.com",
    ...
  }
]
```

**f) Actualizar Cliente**

```typescript
@Patch(':id')
async actualizar(
  @Param('id') id: number,
  @Body() actualizarClienteDto: ActualizarClienteDto
): Promise<Cliente> {
  return await this.clientesService.actualizarCliente(id, actualizarClienteDto);
}
```

**Request:**
```bash
PATCH http://localhost:3002/clientes/1
Content-Type: application/json

{
  "telefono": "111222333"
}
```

**g) Eliminar Cliente**

```typescript
@Delete(':id')
async eliminar(@Param('id') id: number): Promise<{ mensaje: string }> {
  return await this.clientesService.eliminarCliente(id);
}
```

**Request:**
```bash
DELETE http://localhost:3002/clientes/1
```

**Response:**
```json
{
  "mensaje": "Cliente Juan Pérez eliminado exitosamente"
}
```

---

### 4. **DTOs** - Validación de Datos

#### CrearClienteDto

**Ubicación:** `src/clientes/dto/crear-cliente.dto.ts`

```typescript
export class CrearClienteDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MaxLength(100)
  nombre: string;
  
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(100)
  email: string;
  
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @IsString()
  @MaxLength(20)
  telefono: string;
}
```

**Validaciones:**
- ✓ Todos los campos son obligatorios
- ✓ Email debe tener formato válido
- ✓ Longitudes máximas definidas
- ✓ Mensajes de error personalizados

#### ActualizarClienteDto

**Ubicación:** `src/clientes/dto/actualizar-cliente.dto.ts`

```typescript
export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;
  
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(100)
  email?: string;
  
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
  
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

**Características:**
- Todos los campos son opcionales
- Solo se actualizan los campos enviados
- Mantiene las mismas validaciones que CrearClienteDto

---

### 5. **Database Module** - Configuración de BD

**Ubicación:** `src/database/database.module.ts`

**Función:** Configurar la conexión a SQLite con TypeORM.

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/clientes.db',
      entities: [Cliente],
      synchronize: true,  // Auto-crear tablas (solo desarrollo)
      logging: false
    })
  ]
})
export class DatabaseModule {}
```

**Configuración:**
- **type:** `sqlite` - Base de datos liviana y sin servidor
- **database:** Ruta al archivo `.db`
- **synchronize:** `true` - Crea/actualiza tablas automáticamente
- **entities:** Lista de entidades a gestionar

---

## 🗄️ Base de Datos

### Ubicación Física
- **Archivo:** `apps/backend/clientes/data/clientes.db`
- **Tipo:** SQLite
- **Persistencia:** El archivo se monta como volumen en Docker

### Esquema de la Tabla `clientes`

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| nombre | VARCHAR(100) | NOT NULL |
| email | VARCHAR(100) | UNIQUE, NOT NULL |
| telefono | VARCHAR(20) | NOT NULL |
| activo | BOOLEAN | DEFAULT true |
| fechaCreacion | DATETIME | NOT NULL |
| fechaActualizacion | DATETIME | NOT NULL |
| fechaEliminacion | DATETIME | NULL |

### Consultas SQL Equivalentes

**Crear cliente:**
```sql
INSERT INTO clientes (nombre, email, telefono, activo, fechaCreacion, fechaActualizacion)
VALUES ('Juan Pérez', 'juan@ejemplo.com', '123456789', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

**Obtener activos:**
```sql
SELECT * FROM clientes 
WHERE fechaEliminacion IS NULL 
ORDER BY fechaCreacion DESC;
```

**Buscar por nombre:**
```sql
SELECT * FROM clientes 
WHERE nombre LIKE '%Juan%' 
  AND fechaEliminacion IS NULL;
```

**Soft delete:**
```sql
UPDATE clientes 
SET fechaEliminacion = CURRENT_TIMESTAMP, activo = 0 
WHERE id = 1;
```

---

## ⚙️ Variables de Entorno

```env
# Puerto del servicio
PORT=3002
NODE_ENV=development
```

---

## 🔄 Flujo de Datos

```
1. Request HTTP llega al Controller
   GET /clientes/1
            ↓
2. Controller delega al Service
   clientesService.obtenerClientePorId(1)
            ↓
3. Service consulta el Repository (TypeORM)
   clienteRepository.findOne({ where: { id: 1 } })
            ↓
4. TypeORM ejecuta query SQL en SQLite
   SELECT * FROM clientes WHERE id = 1 AND fechaEliminacion IS NULL
            ↓
5. SQLite retorna datos
   { id: 1, nombre: "Juan Pérez", ... }
            ↓
6. Service procesa y valida
   Si no existe → throw NotFoundException
            ↓
7. Controller retorna JSON al cliente
   HTTP 200 OK
   { "id": 1, "nombre": "Juan Pérez", ... }
```

---

## 🐛 Logs y Debugging

```
🌐 Microservicio de Clientes iniciado
📍 URL: http://localhost:3002
📊 Endpoints disponibles:
   • GET    /clientes
   • POST   /clientes
   • GET    /clientes/:id
   • PATCH  /clientes/:id
   • DELETE /clientes/:id

Cliente creado: 1 - Juan Pérez
Cliente actualizado: 1 - Juan Pérez
Cliente eliminado (soft delete): 1 - Juan Pérez
```

---

## 🚀 Inicio y Despliegue

### Desarrollo Local

```bash
cd apps/backend/clientes
npm install
npm run build
npm run start
```

### Docker

```bash
docker build -t backend-clientes .
docker run -p 3002:3002 -v ./data:/app/data backend-clientes
```

### Docker Compose (Recomendado)

```bash
docker-compose up backend-clientes
```

---

## 🧪 Pruebas con cURL

### Crear Cliente
```bash
curl -X POST http://localhost:3002/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "123456789"
  }'
```

### Listar Todos
```bash
curl http://localhost:3002/clientes
```

### Obtener por ID
```bash
curl http://localhost:3002/clientes/1
```

### Buscar por Email
```bash
curl http://localhost:3002/clientes/buscar/email/juan@ejemplo.com
```

### Buscar por Nombre
```bash
curl http://localhost:3002/clientes/buscar/nombre/Juan
```

### Actualizar
```bash
curl -X PATCH http://localhost:3002/clientes/1 \
  -H "Content-Type: application/json" \
  -d '{"telefono": "111222333"}'
```

### Eliminar
```bash
curl -X DELETE http://localhost:3002/clientes/1
```

---

## ❗ Manejo de Errores

### Error: Email duplicado
```json
{
  "statusCode": 409,
  "message": "Ya existe un cliente con el email juan@ejemplo.com",
  "error": "Conflict"
}
```

### Error: Cliente no encontrado
```json
{
  "statusCode": 404,
  "message": "Cliente con ID 99 no encontrado",
  "error": "Not Found"
}
```

### Error: Validación de DTO
```json
{
  "statusCode": 400,
  "message": [
    "El nombre es obligatorio",
    "Email inválido"
  ],
  "error": "Bad Request"
}
```

---

## 📊 Características del Microservicio

✅ **CRUD Completo:** Crear, Leer, Actualizar, Eliminar  
✅ **Soft Delete:** No se pierden datos, se marcan como eliminados  
✅ **Validación Robusta:** DTOs con validaciones automáticas  
✅ **Búsqueda Flexible:** Por ID, email o nombre (parcial)  
✅ **Email Único:** Previene duplicados  
✅ **Timestamps Automáticos:** Creación y actualización  
✅ **Logs Detallados:** Trazabilidad de operaciones  
✅ **SQLite:** Base de datos liviana y portable  

---

## 🔮 Posibles Mejoras

- Agregar paginación en listado
- Implementar filtros avanzados
- Agregar campo de dirección
- Implementar hard delete para administradores
- Agregar índices en campos de búsqueda frecuente
- Implementar caché para consultas frecuentes
- Agregar validación de teléfono con formato específico

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Autor:** Sistema de Reservas MCP + Gemini

