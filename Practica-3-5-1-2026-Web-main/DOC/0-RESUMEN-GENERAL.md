# 📘 Sistema de Reservas MCP + Gemini AI - Resumen General

## 🎯 Descripción del Sistema

Sistema de reservas inteligente que permite a los usuarios interactuar mediante **lenguaje natural** para gestionar clientes y reservas. Implementa el protocolo **Model Context Protocol (MCP)** para orquestar servicios mediante **Gemini AI**, eliminando la necesidad de conocer endpoints específicos o estructuras de datos.

---

## 🏗️ Arquitectura de 3 Capas

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA 1: API GATEWAY                  │
│                    (Puerto 3000)                        │
│                                                         │
│  • Recibe lenguaje natural del usuario                 │
│  • Integración con Gemini AI                           │
│  • Function Calling (Tools)                            │
│  • Orquestación inteligente                            │
│  • Proxy REST tradicional                              │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC 2.0
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    CAPA 2: MCP SERVER                   │
│                    (Puerto 3001)                        │
│                                                         │
│  • Implementa protocolo JSON-RPC 2.0                   │
│  • Expone 3 Tools:                                     │
│    1. buscar_cliente (búsqueda)                        │
│    2. validar_disponibilidad (validación)              │
│    3. crear_reserva (acción)                           │
│  • Abstracción de lógica de negocio                    │
└────────────────────┬────────────────────────────────────┘
                     │ REST HTTP
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    CAPA 3: BACKEND                      │
│                                                         │
│  ┌────────────────────┐    ┌────────────────────┐     │
│  │ Clientes (3002)    │    │ Reservas (3003)    │     │
│  │ Entidad Maestro    │◄───│ Entidad Movimiento │     │
│  │ SQLite: clientes.db│    │ SQLite: reservas.db│     │
│  └────────────────────┘    └────────────────────┘     │
│                                      ↕                   │
│                             ┌────────────────────┐     │
│                             │ Redis (6379)       │     │
│                             │ Idempotencia       │     │
│                             └────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes del Sistema

### 1. **API Gateway** (Puerto 3000)

**Tecnologías:** NestJS, Gemini AI SDK, TypeScript

**Responsabilidades:**
- Recibir solicitudes en lenguaje natural
- Consultar herramientas disponibles en MCP Server
- Enviar contexto a Gemini AI con Function Calling
- Ejecutar herramientas según decisión de Gemini
- Generar respuestas en lenguaje natural
- Actuar como proxy REST tradicional

**Endpoints principales:**
- `POST /api/procesador` - Procesar lenguaje natural
- `GET /api/procesador/estado` - Estado del sistema
- `GET /api/clientes/*` - Proxy a microservicio clientes
- `GET /api/reservas/*` - Proxy a microservicio reservas

**Documentación detallada:** [1-API-GATEWAY.md](./1-API-GATEWAY.md)

---

### 2. **MCP Server** (Puerto 3001)

**Tecnologías:** TypeScript, Express, JSON-RPC 2.0

**Responsabilidades:**
- Implementar protocolo JSON-RPC 2.0
- Registrar y exponer herramientas (Tools)
- Ejecutar herramientas con validaciones
- Comunicarse con microservicios backend
- Gestionar errores estandarizados

**Métodos JSON-RPC:**
- `tools/list` - Listar herramientas disponibles
- `tools/call` - Ejecutar una herramienta específica

**Herramientas (Tools):**

1. **buscar_cliente**
   - Tipo: Búsqueda/Consulta
   - Parámetros: `id?, email?, nombre?`
   - Función: Buscar clientes por diferentes criterios

2. **validar_disponibilidad**
   - Tipo: Validación
   - Parámetros: `fechaReserva, duracionMinutos?`
   - Función: Verificar disponibilidad de fecha

3. **crear_reserva**
   - Tipo: Acción/Modificación
   - Parámetros: `clienteId, servicioNombre, fechaReserva, duracionMinutos?, notas?`
   - Función: Crear nueva reserva con validaciones

**Documentación detallada:** [2-MCP-SERVER.md](./2-MCP-SERVER.md)

---

### 3. **Backend Clientes** (Puerto 3002)

**Tecnologías:** NestJS, TypeORM, SQLite

**Tipo de Entidad:** Maestro

**Responsabilidades:**
- Gestión CRUD de clientes
- Validación de datos
- Búsquedas por ID, email o nombre
- Soft delete
- Persistencia en SQLite

**Campos de la entidad:**
- `id` (PK, autoincremental)
- `nombre` (string, requerido)
- `email` (string, único, requerido)
- `telefono` (string, requerido)
- `activo` (boolean, default true)
- `fechaCreacion` (timestamp automático)
- `fechaActualizacion` (timestamp automático)
- `fechaEliminacion` (nullable, soft delete)

**Endpoints principales:**
- `GET /clientes` - Listar todos
- `POST /clientes` - Crear
- `GET /clientes/:id` - Obtener por ID
- `GET /clientes/buscar/email/:email` - Buscar por email
- `GET /clientes/buscar/nombre/:nombre` - Buscar por nombre
- `PATCH /clientes/:id` - Actualizar
- `DELETE /clientes/:id` - Eliminar (soft)

**Documentación detallada:** [3-BACKEND-CLIENTES.md](./3-BACKEND-CLIENTES.md)

---

### 4. **Backend Reservas** (Puerto 3003)

**Tecnologías:** NestJS, TypeORM, SQLite, Redis, Axios

**Tipo de Entidad:** Movimiento

**Responsabilidades:**
- Gestión de reservas
- Validación de cliente vía HTTP
- Validación de disponibilidad
- Implementación de Idempotent Consumer
- Soft delete
- Persistencia en SQLite + caché en Redis

**Campos de la entidad:**
- `id` (PK, autoincremental)
- `clienteId` (FK lógico a microservicio Clientes)
- `servicioNombre` (string, requerido)
- `fechaReserva` (datetime, requerido)
- `duracionMinutos` (integer, default 60)
- `estado` (enum: pendiente, confirmada, completada, cancelada)
- `notas` (string, opcional)
- `idempotenciaKey` (string, único, para prevenir duplicados)
- `fechaCreacion` (timestamp automático)
- `fechaActualizacion` (timestamp automático)
- `fechaCancelacion` (nullable, soft delete)

**Endpoints principales:**
- `GET /reservas` - Listar todas
- `POST /reservas` - Crear (con header X-Idempotency-Key)
- `GET /reservas/:id` - Obtener por ID
- `GET /reservas/cliente/:clienteId` - Por cliente
- `POST /reservas/validar-disponibilidad` - Validar fecha
- `PATCH /reservas/:id/cancelar` - Cancelar

**Patrón Idempotent Consumer:**
- Utiliza Redis para detectar mensajes duplicados
- Clave de idempotencia única por solicitud
- TTL de 24 horas en Redis
- Retorna resultado cacheado si ya fue procesado

**Documentación detallada:** [4-BACKEND-RESERVAS.md](./4-BACKEND-RESERVAS.md)

---

### 5. **Redis** (Puerto 6379)

**Función:** Caché para implementar Idempotent Consumer

**Uso:**
- Almacenar claves de idempotencia
- TTL de 24 horas por defecto
- Prevenir procesamiento duplicado de reservas

---

## 🔄 Flujo de Ejecución Completo

### Ejemplo: "Crea una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10 AM"

```
1. Usuario envía mensaje en lenguaje natural
   POST http://localhost:3000/api/procesador
   { "mensaje": "Crea una reserva de corte de cabello para Juan Pérez el 30 de enero..." }
                              ↓
2. API Gateway (ProcesadorController)
   • Recibe request HTTP
   • Delega a ProcesadorService
                              ↓
3. ProcesadorService consulta herramientas
   • MCP Client → POST http://mcp-server:3001/rpc
   • Método JSON-RPC: "tools/list"
   • Obtiene: [buscar_cliente, validar_disponibilidad, crear_reserva]
                              ↓
4. GeminiService procesa mensaje
   • Envía mensaje + herramientas a Gemini AI
   • Gemini analiza: necesita clienteId, debe validar fecha, luego crear
   • Gemini decide ejecutar 3 herramientas en secuencia
   • Retorna: function_calls con argumentos extraídos
                              ↓
5. ProcesadorService ejecuta herramientas

   5.1) Ejecutar: buscar_cliente({ nombre: "Juan Pérez" })
        • MCP Client → POST http://mcp-server:3001/rpc
        • MCP Server → GET http://backend-clientes:3002/clientes/buscar/nombre/Juan%20Pérez
        • Backend Clientes → SQLite query
        • Retorna: { id: 1, nombre: "Juan Pérez", ... }
        
   5.2) Ejecutar: validar_disponibilidad({ fechaReserva: "2026-01-30T10:00:00Z" })
        • MCP Client → POST http://mcp-server:3001/rpc
        • MCP Server → POST http://backend-reservas:3003/reservas/validar-disponibilidad
        • Backend Reservas → SQLite query (contar reservas ese día)
        • Retorna: { disponible: true, reservasExistentes: 3 }
        
   5.3) Ejecutar: crear_reserva({ clienteId: 1, servicioNombre: "Corte de cabello", ... })
        • MCP Client → POST http://mcp-server:3001/rpc
        • MCP Server → POST http://backend-reservas:3003/reservas
        • Backend Reservas:
          → Verifica idempotencia en Redis
          → Valida cliente vía HTTP (GET backend-clientes:3002/clientes/1)
          → Crea reserva en SQLite
          → Guarda en Redis (idempotencia)
        • Retorna: { id: 5, clienteId: 1, ... }
                              ↓
6. ProcesadorService envía resultados a Gemini
   • GeminiService.continueConversation()
   • Envía los 3 resultados a Gemini
   • Gemini genera respuesta en lenguaje natural
                              ↓
7. Respuesta final al usuario
   HTTP 200 OK
   {
     "success": true,
     "mensaje": "He creado exitosamente una reserva de corte de cabello para Juan Pérez 
                 el 30 de enero de 2026 a las 10:00 AM. La reserva tiene el ID 5 y está 
                 confirmada.",
     "herramientasEjecutadas": ["buscar_cliente", "validar_disponibilidad", "crear_reserva"],
     "resultados": [...]
   }
```

---

## 🌐 Puertos y URLs

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| API Gateway | 3000 | http://localhost:3000/api | Gateway principal |
| MCP Server | 3001 | http://localhost:3001/rpc | Servidor JSON-RPC |
| Backend Clientes | 3002 | http://localhost:3002/clientes | Microservicio clientes |
| Backend Reservas | 3003 | http://localhost:3003/reservas | Microservicio reservas |
| Redis | 6379 | redis://localhost:6379 | Caché para idempotencia |

---

## ⚙️ Variables de Entorno

### API Gateway (.env)
```env
PORT=3000
NODE_ENV=development
MCP_SERVER_HOST=mcp-server
MCP_SERVER_PORT=3001
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002
MICROSERVICIO_RESERVAS_HOST=backend-reservas
MICROSERVICIO_RESERVAS_PORT=3003
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-pro
```

### MCP Server
```env
PORT=3001
NODE_ENV=development
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002
MICROSERVICIO_RESERVAS_HOST=backend-reservas
MICROSERVICIO_RESERVAS_PORT=3003
```

### Backend Clientes
```env
PORT=3002
NODE_ENV=development
```

### Backend Reservas
```env
PORT=3003
NODE_ENV=development
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## 🚀 Inicio del Sistema

### Con Docker Compose (Recomendado)

```bash
# 1. Configurar API Key de Gemini
echo "GEMINI_API_KEY=tu_api_key" > .env

# 2. Iniciar todos los servicios
docker-compose up --build

# 3. Verificar estado
curl http://localhost:3000/api/procesador/estado
```

### Desarrollo Local

```bash
# Terminal 1: Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Backend Clientes
cd apps/backend/clientes
npm install && npm run build && npm start

# Terminal 3: Backend Reservas
cd apps/backend/reservas
npm install && npm run build && npm start

# Terminal 4: MCP Server
cd apps/mcp-server
npm install && npm start

# Terminal 5: API Gateway
cd apps/api-gateway
npm install && npm run start:dev
```

---

## 🧪 Ejemplos de Uso

### 1. Verificar Estado del Sistema
```bash
curl http://localhost:3000/api/procesador/estado
```

**Respuesta:**
```json
{
  "mcpServer": "conectado",
  "geminiAI": "configurado",
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

---

### 2. Crear Cliente (REST tradicional)
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "123456789"
  }'
```

---

### 3. Buscar Cliente (Lenguaje Natural)
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Busca el cliente Juan Pérez"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "He encontrado al cliente Juan Pérez. Su email es juan@ejemplo.com y su teléfono es 123456789. El cliente está activo en el sistema.",
  "herramientasEjecutadas": ["buscar_cliente"],
  "resultados": [...]
}
```

---

### 4. Validar Disponibilidad (Lenguaje Natural)
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "¿Está disponible el 30 de enero de 2026 a las 10 AM?"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "Sí, la fecha 30 de enero de 2026 a las 10:00 AM está disponible. Actualmente hay 3 reservas ese día, así que puedes crear la reserva sin problema.",
  "herramientasEjecutadas": ["validar_disponibilidad"],
  "resultados": [...]
}
```

---

### 5. Crear Reserva Completa (Lenguaje Natural)
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Crea una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10 AM"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "mensaje": "He creado exitosamente una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10:00 AM. La reserva tiene el ID 5, duración de 60 minutos y está confirmada.",
  "herramientasEjecutadas": [
    "buscar_cliente",
    "validar_disponibilidad",
    "crear_reserva"
  ],
  "resultados": [...]
}
```

---

### 6. Consultas Complejas (Lenguaje Natural)
```bash
# Ejemplo 1
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Quiero hacer una reserva de masaje para María el próximo viernes a las 3 PM"
  }'

# Ejemplo 2
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Muéstrame los datos del cliente con email maria@ejemplo.com"
  }'

# Ejemplo 3
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{
    "mensaje": "Verifica si el 15 de febrero está disponible"
  }'
```

---

## 📊 Tecnologías Utilizadas

| Componente | Tecnologías |
|------------|-------------|
| **API Gateway** | NestJS, TypeScript, Gemini AI SDK, Axios |
| **MCP Server** | TypeScript, Express, JSON-RPC 2.0, Axios |
| **Backend Clientes** | NestJS, TypeORM, SQLite, class-validator |
| **Backend Reservas** | NestJS, TypeORM, SQLite, Redis, ioredis, Axios |
| **Base de Datos** | SQLite (clientes.db, reservas.db) |
| **Caché** | Redis 7 |
| **Contenedores** | Docker, Docker Compose |
| **IA** | Gemini 2.0 Flash (Google) |

---

## 🎯 Patrones y Principios Implementados

### Patrones de Arquitectura
- **Microservicios:** Servicios independientes y escalables
- **API Gateway:** Punto de entrada unificado
- **Service Mesh (simplificado):** Comunicación entre servicios

### Patrones de Diseño
- **Idempotent Consumer:** Prevención de procesamiento duplicado
- **Soft Delete:** Eliminación lógica sin pérdida de datos
- **DTO Pattern:** Validación y transformación de datos
- **Repository Pattern:** Abstracción de acceso a datos
- **Proxy Pattern:** Gateway como proxy a servicios backend

### Principios SOLID
- **Single Responsibility:** Cada servicio tiene una responsabilidad clara
- **Open/Closed:** Fácil agregar nuevas Tools sin modificar código existente
- **Dependency Inversion:** Inyección de dependencias en NestJS

### Otros Principios
- **DRY (Don't Repeat Yourself):** Reutilización de código
- **KISS (Keep It Simple):** Implementación clara y mantenible
- **Separation of Concerns:** Separación clara entre capas

---

## ✅ Características Destacadas

### 1. **Interfaz en Lenguaje Natural**
- Usuario no necesita conocer endpoints o estructuras de datos
- Gemini AI interpreta intención y extrae parámetros
- Respuestas conversacionales y amigables

### 2. **Orquestación Inteligente**
- Gemini decide automáticamente qué herramientas ejecutar
- Secuencia de ejecución optimizada
- Manejo inteligente de dependencias entre herramientas

### 3. **Protocolo MCP Estándar**
- Implementación completa de JSON-RPC 2.0
- Herramientas con JSON Schema
- Fácil extensión con nuevas Tools

### 4. **Idempotencia**
- Previene procesamiento duplicado
- Usa Redis como caché distribuido
- TTL configurable (24 horas por defecto)

### 5. **Validación Robusta**
- DTOs con class-validator
- Validación de cliente vía HTTP
- Validación de disponibilidad antes de crear reservas

### 6. **Arquitectura de Microservicios**
- Servicios independientes y escalables
- Comunicación HTTP REST entre servicios
- Bases de datos independientes (SQLite)

### 7. **Soft Delete**
- No se pierden datos al eliminar
- Mantiene integridad referencial
- Permite auditoría completa

### 8. **Logs Detallados**
- Trazabilidad completa de operaciones
- Formato estructurado y legible
- Diferentes niveles (log, warn, error)

---

## 🐛 Manejo de Errores

### Errores Comunes y Soluciones

**1. GEMINI_API_KEY no configurada**
```
Error: GEMINI_API_KEY no configurada
Solución: Configurar en .env o variable de entorno
```

**2. MCP Server desconectado**
```
Error: No se pudo conectar con el MCP Server
Solución: Verificar que mcp-server esté ejecutándose en puerto 3001
```

**3. Cliente no encontrado**
```
Error: Cliente con ID X no encontrado
Solución: Verificar que el cliente existe o crearlo primero
```

**4. Email duplicado**
```
Error: Ya existe un cliente con el email X
Solución: Usar otro email o buscar el cliente existente
```

**5. Fecha no disponible**
```
Error: La fecha y hora solicitada no está disponible
Solución: Usar validar_disponibilidad para encontrar horarios libres
```

**6. Redis desconectado**
```
Warning: Error de conexión a Redis
Solución: Verificar que Redis esté ejecutándose en puerto 6379
Nota: El sistema continúa funcionando sin idempotencia
```

---

## 📈 Métricas del Sistema

### Endpoints Totales
- **API Gateway:** 15+ endpoints
- **MCP Server:** 3 métodos JSON-RPC
- **Backend Clientes:** 7 endpoints REST
- **Backend Reservas:** 6 endpoints REST

### Herramientas MCP
- 3 Tools implementadas
- Extensible fácilmente

### Base de Datos
- 2 tablas SQLite (clientes, reservas)
- Soft delete en ambas
- Timestamps automáticos

---

## 🔮 Posibles Mejoras Futuras

### Funcionalidad
- [ ] Autenticación y autorización (JWT)
- [ ] Sistema de roles y permisos
- [ ] Notificaciones por email/SMS
- [ ] Recordatorios automáticos
- [ ] Sistema de pagos
- [ ] Gestión de recursos (salas, empleados)
- [ ] Calendario visual
- [ ] Reportes y estadísticas
- [ ] Integración con Google Calendar

### Técnicas
- [ ] Rate limiting
- [ ] Caché de consultas frecuentes
- [ ] Paginación en listados
- [ ] Búsqueda full-text
- [ ] Migración a PostgreSQL
- [ ] Message broker (RabbitMQ/Kafka)
- [ ] Observabilidad (Prometheus, Grafana)
- [ ] Tests unitarios y e2e
- [ ] CI/CD pipeline
- [ ] Kubernetes deployment

### IA
- [ ] Soporte multi-modelo (OpenAI, Claude)
- [ ] Conversaciones multi-turno
- [ ] Historial de chat
- [ ] Sugerencias inteligentes
- [ ] Análisis de sentimiento
- [ ] Personalización de respuestas

---

## 📚 Documentación Completa

1. **[0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md)** ← Estás aquí
2. **[1-API-GATEWAY.md](./1-API-GATEWAY.md)** - Documentación del API Gateway
3. **[2-MCP-SERVER.md](./2-MCP-SERVER.md)** - Documentación del MCP Server
4. **[3-BACKEND-CLIENTES.md](./3-BACKEND-CLIENTES.md)** - Documentación del Backend Clientes
5. **[4-BACKEND-RESERVAS.md](./4-BACKEND-RESERVAS.md)** - Documentación del Backend Reservas

---

## 🎓 Objetivos del Taller Cumplidos

✅ **Comprender MCP:** Implementación completa del protocolo  
✅ **Diseñar Tools:** 3 Tools con JSON Schema válido  
✅ **Implementar JSON-RPC 2.0:** Servidor completamente funcional  
✅ **Integrar Gemini AI:** Function Calling implementado  
✅ **Reutilizar código:** Microservicios de talleres anteriores  
✅ **Arquitectura de microservicios:** 2 servicios independientes  
✅ **Entidades Maestro-Movimiento:** Clientes y Reservas  
✅ **Base de datos SQLite:** Persistencia operativa  
✅ **Patrón Idempotent Consumer:** Implementado con Redis  
✅ **Docker:** Todos los servicios containerizados  
✅ **Documentación:** Completa y detallada  

---

## 👨‍💻 Créditos

**Proyecto:** Sistema de Reservas con MCP + Gemini AI  
**Curso:** Aplicación para el Servidor Web  
**Institución:** ULEAM  
**Fecha:** Enero 2026  

---

## 📞 Soporte

Para reportar issues o contribuir:
1. Revisar la documentación específica de cada componente
2. Verificar logs detallados en cada servicio
3. Comprobar variables de entorno
4. Asegurar que todos los servicios estén ejecutándose

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Estado:** Producción

---

## 🎉 ¡Gracias por usar el Sistema de Reservas MCP + Gemini AI!

Para comenzar, simplemente ejecuta:
```bash
docker-compose up --build
```

Y luego prueba:
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "Hola, ¿qué puedes hacer?"}'
```

