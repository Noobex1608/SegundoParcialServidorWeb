# 📘 MCP Server - Documentación Técnica

## 🎯 Propósito

El **MCP Server (Model Context Protocol Server)** es el componente que implementa el protocolo MCP para exponer herramientas (Tools) que pueden ser ejecutadas por agentes de IA. Actúa como intermediario entre el API Gateway con Gemini AI y los microservicios backend.

---

## 🏗️ Arquitectura

```
API Gateway (Gemini AI)
         ↓ JSON-RPC 2.0
    MCP Server
    ├── Tool 1: buscar_cliente
    ├── Tool 2: validar_disponibilidad
    └── Tool 3: crear_reserva
         ↓ REST HTTP
    Backend Services
    ├── Clientes (puerto 3002)
    └── Reservas (puerto 3003)
```

### Ubicación en el Proyecto
- **Carpeta:** `apps/mcp-server/`
- **Puerto:** `3001`
- **Tecnologías:** TypeScript, Express, JSON-RPC 2.0

---

## 📁 Estructura del Código

```
mcp-server/
├── src/
│   ├── server.ts                       # Servidor principal
│   │
│   ├── tools/                          # Herramientas MCP
│   │   ├── registry.ts                 # Registro de herramientas
│   │   ├── buscar-cliente.tool.ts      # Tool: Búsqueda de clientes
│   │   ├── validar-disponibilidad.tool.ts  # Tool: Validación
│   │   └── crear-reserva.tool.ts       # Tool: Creación de reservas
│   │
│   └── services/
│       └── backend-client.ts           # Cliente HTTP para backend
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 🔧 Componentes Principales

### 1. **Server.ts** - Servidor JSON-RPC 2.0

**Ubicación:** `src/server.ts`

**Responsabilidad:** Implementar el protocolo JSON-RPC 2.0 para comunicación con el API Gateway.

#### Estructura JSON-RPC 2.0

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": "req-1234567890-1"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [...]
  },
  "id": "req-1234567890-1"
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Método no encontrado",
    "data": {...}
  },
  "id": "req-1234567890-1"
}
```

#### Códigos de Error JSON-RPC 2.0

```typescript
const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,        // JSON inválido
  INVALID_REQUEST: -32600,    // Request inválido
  METHOD_NOT_FOUND: -32601,   // Método no existe
  INVALID_PARAMS: -32602,     // Parámetros inválidos
  INTERNAL_ERROR: -32603      // Error interno
};
```

#### Endpoints del Servidor

**a) Endpoint JSON-RPC Principal**

`POST /rpc`

Maneja dos métodos:

1. **`tools/list`** - Lista todas las herramientas disponibles
2. **`tools/call`** - Ejecuta una herramienta específica

```typescript
app.post('/rpc', async (req: Request, res: Response) => {
  const request = req.body;
  
  // Validar estructura JSON-RPC 2.0
  if (!request || request.jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: JsonRpcErrorCodes.INVALID_REQUEST,
        message: 'Solicitud JSON-RPC inválida'
      },
      id: null
    });
  }
  
  // Manejar métodos
  switch (request.method) {
    case 'tools/list':
      const tools = toolRegistry.getAllTools();
      return res.json({
        jsonrpc: '2.0',
        result: { tools },
        id: request.id
      });
      
    case 'tools/call':
      const { name, arguments: toolArgs } = request.params;
      const result = await toolRegistry.executeTool(name, toolArgs);
      return res.json({
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }],
          isError: !result.success
        },
        id: request.id
      });
  }
});
```

**b) Health Check Endpoint**

`GET /health`

Verifica el estado del servidor.

**Response:**
```json
{
  "status": "ok",
  "service": "MCP Server - Sistema de Reservas",
  "timestamp": "2026-01-05T10:30:00.000Z",
  "tools": [
    "buscar_cliente",
    "validar_disponibilidad",
    "crear_reserva"
  ]
}
```

**c) Endpoint REST alternativo**

`GET /tools`

Lista herramientas en formato REST simple.

**Response:**
```json
{
  "count": 3,
  "tools": [...]
}
```

---

### 2. **Tool Registry** - Registro de Herramientas

**Ubicación:** `src/tools/registry.ts`

**Función:** Gestionar el registro y ejecución de todas las herramientas MCP.

#### Estructura de una Tool

Cada herramienta debe cumplir con el estándar MCP:

```typescript
interface Tool {
  name: string;              // Identificador único
  description: string;       // Descripción para la IA
  inputSchema: {             // JSON Schema de parámetros
    type: 'object',
    properties: {...},
    required: [...]
  };
  execute: (params, backendClient) => Promise<any>;  // Función
}
```

#### Métodos del Registry

```typescript
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private backendClient: BackendClient;
  
  constructor() {
    this.backendClient = new BackendClient();
    this.registerTools();
  }
  
  // Registrar todas las herramientas
  private registerTools(): void {
    this.tools.set('buscar_cliente', buscarClienteTool);
    this.tools.set('validar_disponibilidad', validarDisponibilidadTool);
    this.tools.set('crear_reserva', crearReservaTool);
  }
  
  // Obtener todas las herramientas
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  // Verificar si existe una herramienta
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  // Ejecutar una herramienta
  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    return await tool.execute(params, this.backendClient);
  }
}
```

---

### 3. **Tools (Herramientas MCP)**

---

#### **Tool 1: buscar_cliente**

**Ubicación:** `src/tools/buscar-cliente.tool.ts`

**Propósito:** Buscar clientes por ID, email o nombre.

**Tipo:** Tool de Búsqueda/Consulta

**Parámetros:**
```typescript
{
  id?: number;      // ID del cliente (opcional)
  email?: string;   // Email del cliente (opcional)
  nombre?: string;  // Nombre del cliente (opcional)
}
```

**Validación:** Al menos uno de los parámetros debe estar presente.

**Lógica de Ejecución:**

```typescript
async execute(params: { id?, email?, nombre? }, backendClient) {
  // 1. Validar que haya al menos un parámetro
  if (!params.id && !params.email && !params.nombre) {
    return {
      success: false,
      error: 'Debe proporcionar al menos uno: id, email o nombre'
    };
  }
  
  // 2. Búsqueda por ID (más específica)
  if (params.id) {
    const cliente = await backendClient.buscarClientePorId(params.id);
    if (!cliente) {
      return {
        success: false,
        error: `No se encontró cliente con ID ${params.id}`
      };
    }
    return { success: true, data: cliente };
  }
  
  // 3. Búsqueda por email
  if (params.email) {
    const cliente = await backendClient.buscarClientePorEmail(params.email);
    return { success: true, data: cliente };
  }
  
  // 4. Búsqueda por nombre (puede retornar múltiples)
  if (params.nombre) {
    const clientes = await backendClient.buscarClientePorNombre(params.nombre);
    return {
      success: true,
      data: clientes.length === 1 ? clientes[0] : clientes,
      message: `Se encontraron ${clientes.length} clientes`
    };
  }
}
```

**Ejemplo de uso desde Gemini:**
```
Usuario: "Busca el cliente Juan Pérez"
Gemini ejecuta: buscar_cliente({ nombre: "Juan Pérez" })
```

**Response exitoso:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "telefono": "123456789",
    "activo": true
  },
  "message": "Cliente encontrado exitosamente"
}
```

---

#### **Tool 2: validar_disponibilidad**

**Ubicación:** `src/tools/validar-disponibilidad.tool.ts`

**Propósito:** Validar si una fecha y hora está disponible para crear una reserva.

**Tipo:** Tool de Validación

**Parámetros:**
```typescript
{
  fechaReserva: string;      // ISO 8601 (ej: "2026-01-30T10:00:00Z")
  duracionMinutos?: number;  // Duración (default: 60)
}
```

**Validaciones:**
1. Fecha debe ser futura
2. Formato debe ser ISO 8601 válido
3. No debe haber conflictos con reservas existentes

**Lógica de Ejecución:**

```typescript
async execute(params: { fechaReserva, duracionMinutos? }, backendClient) {
  const duracion = params.duracionMinutos || 60;
  
  // 1. Validar que la fecha sea futura
  const fechaSolicitada = new Date(params.fechaReserva);
  const ahora = new Date();
  
  if (fechaSolicitada <= ahora) {
    return {
      success: false,
      disponible: false,
      error: 'La fecha de reserva debe ser futura'
    };
  }
  
  // 2. Validar formato de fecha
  if (isNaN(fechaSolicitada.getTime())) {
    return {
      success: false,
      disponible: false,
      error: 'Formato de fecha inválido. Use ISO 8601'
    };
  }
  
  // 3. Consultar disponibilidad en el backend
  const resultado = await backendClient.validarDisponibilidad(
    params.fechaReserva,
    duracion
  );
  
  if (resultado.disponible) {
    return {
      success: true,
      disponible: true,
      message: `Fecha ${fechaSolicitada.toLocaleString('es-ES')} disponible`,
      duracionMinutos: duracion
    };
  } else {
    return {
      success: true,
      disponible: false,
      message: 'Fecha NO disponible',
      conflictos: resultado.conflictos,
      sugerencia: 'Elija otra fecha u horario'
    };
  }
}
```

**Ejemplo de uso desde Gemini:**
```
Usuario: "¿Está disponible el 30 de enero a las 10 AM?"
Gemini ejecuta: validar_disponibilidad({ 
  fechaReserva: "2026-01-30T10:00:00Z" 
})
```

**Response exitoso:**
```json
{
  "success": true,
  "disponible": true,
  "message": "La fecha 30/01/2026 10:00:00 está disponible",
  "duracionMinutos": 60
}
```

**Response con conflicto:**
```json
{
  "success": true,
  "disponible": false,
  "message": "La fecha 30/01/2026 10:00:00 NO está disponible",
  "conflictos": 2,
  "reservasConflictivas": [...],
  "sugerencia": "Por favor, elija otra fecha u horario"
}
```

---

#### **Tool 3: crear_reserva**

**Ubicación:** `src/tools/crear-reserva.tool.ts`

**Propósito:** Crear una nueva reserva en el sistema.

**Tipo:** Tool de Acción/Modificación

**Parámetros:**
```typescript
{
  clienteId: number;          // ID del cliente (requerido)
  servicioNombre: string;     // Nombre del servicio (requerido)
  fechaReserva: string;       // ISO 8601 (requerido)
  duracionMinutos?: number;   // Duración (default: 60)
  notas?: string;             // Notas adicionales (opcional)
}
```

**Validaciones automáticas:**
1. Cliente existe y está activo
2. Fecha es futura
3. Hay disponibilidad en la fecha solicitada

**Lógica de Ejecución:**

```typescript
async execute(params, backendClient) {
  // 1. Validar que el cliente existe
  const cliente = await backendClient.buscarClientePorId(params.clienteId);
  if (!cliente) {
    return {
      success: false,
      error: `No se encontró cliente con ID ${params.clienteId}`,
      sugerencia: 'Primero busque el cliente usando buscar_cliente'
    };
  }
  
  if (!cliente.activo) {
    return {
      success: false,
      error: `El cliente ${cliente.nombre} no está activo`
    };
  }
  
  // 2. Validar que la fecha sea futura
  const fechaSolicitada = new Date(params.fechaReserva);
  if (fechaSolicitada <= new Date()) {
    return {
      success: false,
      error: 'La fecha de reserva debe ser futura'
    };
  }
  
  // 3. Validar disponibilidad
  const duracion = params.duracionMinutos || 60;
  const disponibilidad = await backendClient.validarDisponibilidad(
    params.fechaReserva,
    duracion
  );
  
  if (!disponibilidad.disponible) {
    return {
      success: false,
      error: 'La fecha y hora solicitada no está disponible',
      conflictos: disponibilidad.conflictos,
      sugerencia: 'Use validar_disponibilidad para encontrar horarios'
    };
  }
  
  // 4. Crear la reserva
  const reserva = await backendClient.crearReserva({
    clienteId: params.clienteId,
    servicioNombre: params.servicioNombre,
    fechaReserva: params.fechaReserva,
    duracionMinutos: duracion,
    notas: params.notas
  });
  
  return {
    success: true,
    data: reserva,
    message: `Reserva creada exitosamente para ${cliente.nombre}`,
    detalles: {
      reservaId: reserva.id,
      cliente: cliente.nombre,
      servicio: reserva.servicioNombre,
      fecha: new Date(reserva.fechaReserva).toLocaleString('es-ES'),
      duracion: `${reserva.duracionMinutos} minutos`,
      estado: reserva.estado
    }
  };
}
```

**Ejemplo de uso desde Gemini:**
```
Usuario: "Crea una reserva de corte de cabello para Juan Pérez 
          el 30 de enero a las 10 AM"

Gemini ejecuta en secuencia:
1. buscar_cliente({ nombre: "Juan Pérez" })
2. validar_disponibilidad({ fechaReserva: "2026-01-30T10:00:00Z" })
3. crear_reserva({ 
     clienteId: 1,
     servicioNombre: "Corte de cabello",
     fechaReserva: "2026-01-30T10:00:00Z"
   })
```

**Response exitoso:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "clienteId": 1,
    "servicioNombre": "Corte de cabello",
    "fechaReserva": "2026-01-30T10:00:00Z",
    "duracionMinutos": 60,
    "estado": "confirmada"
  },
  "message": "Reserva creada exitosamente para Juan Pérez",
  "detalles": {
    "reservaId": 5,
    "cliente": "Juan Pérez",
    "servicio": "Corte de cabello",
    "fecha": "30/01/2026 10:00:00",
    "duracion": "60 minutos",
    "estado": "confirmada"
  }
}
```

---

### 4. **Backend Client** - Cliente HTTP

**Ubicación:** `src/services/backend-client.ts`

**Función:** Comunicarse con los microservicios backend mediante HTTP.

#### Métodos Principales

**a) Buscar Cliente por ID**
```typescript
async buscarClientePorId(id: number) {
  const url = `${this.clientesBaseUrl}/clientes/${id}`;
  const response = await axios.get(url);
  return response.data;
}
```

**b) Buscar Cliente por Email**
```typescript
async buscarClientePorEmail(email: string) {
  const url = `${this.clientesBaseUrl}/clientes/buscar/email/${email}`;
  const response = await axios.get(url);
  return response.data;
}
```

**c) Buscar Cliente por Nombre**
```typescript
async buscarClientePorNombre(nombre: string) {
  const url = `${this.clientesBaseUrl}/clientes/buscar/nombre/${nombre}`;
  const response = await axios.get(url);
  return response.data;
}
```

**d) Validar Disponibilidad**
```typescript
async validarDisponibilidad(fechaReserva: string, duracionMinutos: number) {
  const url = `${this.reservasBaseUrl}/reservas/validar-disponibilidad`;
  const response = await axios.post(url, {
    fechaReserva,
    duracionMinutos
  });
  return response.data;
}
```

**e) Crear Reserva**
```typescript
async crearReserva(datos: CrearReservaDto) {
  const url = `${this.reservasBaseUrl}/reservas`;
  const response = await axios.post(url, datos);
  return response.data;
}
```

#### Configuración de URLs

```typescript
constructor() {
  const clientesHost = process.env.MICROSERVICIO_CLIENTES_HOST || 'localhost';
  const clientesPort = process.env.MICROSERVICIO_CLIENTES_PORT || '3002';
  this.clientesBaseUrl = `http://${clientesHost}:${clientesPort}`;
  
  const reservasHost = process.env.MICROSERVICIO_RESERVAS_HOST || 'localhost';
  const reservasPort = process.env.MICROSERVICIO_RESERVAS_PORT || '3003';
  this.reservasBaseUrl = `http://${reservasHost}:${reservasPort}`;
}
```

---

## ⚙️ Variables de Entorno

```env
# Puerto del servidor
PORT=3001
NODE_ENV=development

# Microservicio de Clientes
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002

# Microservicio de Reservas
MICROSERVICIO_RESERVAS_HOST=backend-reservas
MICROSERVICIO_RESERVAS_PORT=3003
```

---

## 🔄 Flujo de Ejecución Completo

```
1. API Gateway envía request JSON-RPC
   POST /rpc
   {
     "jsonrpc": "2.0",
     "method": "tools/list",
     "id": "req-123"
   }
                    ↓
2. Server valida estructura JSON-RPC 2.0
   ✓ jsonrpc === "2.0"
   ✓ method existe
   ✓ id presente
                    ↓
3. Procesa método "tools/list"
   toolRegistry.getAllTools()
                    ↓
4. Retorna herramientas en formato MCP
   {
     "jsonrpc": "2.0",
     "result": {
       "tools": [
         {
           "name": "buscar_cliente",
           "description": "...",
           "inputSchema": {...}
         }
       ]
     },
     "id": "req-123"
   }
                    ↓
5. Para ejecutar herramienta: "tools/call"
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "buscar_cliente",
       "arguments": { "nombre": "Juan" }
     },
     "id": "req-124"
   }
                    ↓
6. toolRegistry.executeTool()
   → tool.execute(params, backendClient)
                    ↓
7. backendClient llama al microservicio
   GET http://backend-clientes:3002/clientes/buscar/nombre/Juan
                    ↓
8. Backend retorna datos
   { "id": 1, "nombre": "Juan Pérez", ... }
                    ↓
9. Tool formatea respuesta MCP
   {
     "success": true,
     "data": {...},
     "message": "Cliente encontrado"
   }
                    ↓
10. Server retorna al API Gateway
    {
      "jsonrpc": "2.0",
      "result": {
        "content": [{
          "type": "text",
          "text": "{...}"
        }],
        "isError": false
      },
      "id": "req-124"
    }
```

---

## 🐛 Logs y Debugging

El MCP Server genera logs detallados:

```
🚀 ========================================
   MCP Server - Sistema de Reservas
   ========================================
   🌐 Servidor escuchando en puerto 3001
   📡 JSON-RPC endpoint: http://localhost:3001/rpc
   ❤️  Health check: http://localhost:3001/health
   🔧 Tools disponibles: 3
   ========================================

   1. buscar_cliente - Busca información de un cliente
   2. validar_disponibilidad - Valida disponibilidad de fecha
   3. crear_reserva - Crea una nueva reserva


📥 JSON-RPC Request [req-123]: tools/list
   Params: {}
✅ Retornando 3 herramientas

📥 JSON-RPC Request [req-124]: tools/call
   Params: {
     "name": "buscar_cliente",
     "arguments": { "nombre": "Juan" }
   }
✅ Tool ejecutada exitosamente en 45ms
```

---

## 🚀 Inicio y Despliegue

### Desarrollo Local

```bash
cd apps/mcp-server
npm install
npm run start
```

### Docker

```bash
docker build -t mcp-server .
docker run -p 3001:3001 mcp-server
```

### Docker Compose (Recomendado)

```bash
docker-compose up mcp-server
```

---

## 🧪 Pruebas

### Health Check
```bash
curl http://localhost:3001/health
```

### Listar Herramientas (JSON-RPC)
```bash
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": "test-1"
  }'
```

### Ejecutar Herramienta (JSON-RPC)
```bash
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "buscar_cliente",
      "arguments": { "nombre": "Juan" }
    },
    "id": "test-2"
  }'
```

### Listar Herramientas (REST alternativo)
```bash
curl http://localhost:3001/tools
```

---

## ❗ Manejo de Errores

### Error: Backend no disponible
```
❌ Error al ejecutar tool: connect ECONNREFUSED
```
**Solución:** Verificar que backend-clientes y backend-reservas estén ejecutándose.

### Error: Método no encontrado
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Método no encontrado: tools/invalid"
  }
}
```
**Solución:** Usar solo métodos válidos: `tools/list` o `tools/call`.

### Error: Herramienta no existe
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Herramienta no encontrada: invalid_tool"
  }
}
```
**Solución:** Verificar nombre de la herramienta con `tools/list`.

---

## 📊 Características del MCP Server

✅ **Protocolo Estándar:** Implementa JSON-RPC 2.0 completo  
✅ **Extensible:** Fácil agregar nuevas herramientas al registry  
✅ **Validación Robusta:** Validaciones en cada Tool antes de ejecutar  
✅ **Manejo de Errores:** Errores detallados con códigos estándar  
✅ **Logs Detallados:** Trazabilidad completa de cada operación  
✅ **Health Checks:** Monitoreo del estado del servidor  
✅ **Tipado Fuerte:** TypeScript para seguridad en tipos  

---

## 🔮 Cómo Agregar una Nueva Herramienta

### Paso 1: Crear archivo de la tool

```typescript
// src/tools/mi-nueva-tool.ts
export const miNuevaTool = {
  name: 'mi_nueva_tool',
  description: 'Descripción clara para la IA',
  inputSchema: {
    type: 'object',
    properties: {
      parametro1: {
        type: 'string',
        description: 'Descripción del parámetro'
      }
    },
    required: ['parametro1']
  },
  
  async execute(params, backendClient) {
    // Lógica de la herramienta
    return {
      success: true,
      data: {...}
    };
  }
};
```

### Paso 2: Registrar en el Registry

```typescript
// src/tools/registry.ts
import { miNuevaTool } from './mi-nueva-tool';

private registerTools(): void {
  this.tools.set('mi_nueva_tool', miNuevaTool);
  // ... otras tools
}
```

### Paso 3: ¡Listo!

La herramienta estará disponible automáticamente para Gemini AI.

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Autor:** Sistema de Reservas MCP + Gemini

