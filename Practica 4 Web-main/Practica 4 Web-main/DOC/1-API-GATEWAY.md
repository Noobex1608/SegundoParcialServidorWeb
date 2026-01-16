# 📘 API Gateway - Documentación Técnica

## 🎯 Propósito

El **API Gateway** es la puerta de entrada principal del sistema. Su función es recibir solicitudes en lenguaje natural de los usuarios y orquestarlas mediante inteligencia artificial (Gemini AI) para ejecutar operaciones complejas de manera automática.

---

## 🏗️ Arquitectura

```
Usuario → API Gateway → Gemini AI → MCP Server → Backend
   ↑                                                  ↓
   └──────────────── Respuesta Natural ──────────────┘
```

### Ubicación en el Proyecto
- **Carpeta:** `apps/api-gateway/`
- **Puerto:** `3000`
- **Tecnologías:** NestJS, TypeScript, Gemini AI SDK

---

## 📁 Estructura del Código

```
api-gateway/
├── src/
│   ├── main.ts                      # Punto de entrada
│   ├── app.module.ts                # Módulo raíz
│   │
│   ├── procesador/                  # Orquestador principal
│   │   ├── procesador.controller.ts # Controlador HTTP
│   │   ├── procesador.service.ts    # Lógica de orquestación
│   │   └── procesador.module.ts     # Configuración del módulo
│   │
│   ├── gemini/                      # Integración con Gemini AI
│   │   ├── gemini.service.ts        # Servicio de IA
│   │   └── gemini.module.ts         # Configuración del módulo
│   │
│   ├── mcp-client/                  # Cliente JSON-RPC
│   │   ├── mcp-client.service.ts    # Comunicación con MCP
│   │   └── mcp-client.module.ts     # Configuración del módulo
│   │
│   ├── clientes/                    # Proxy REST para clientes
│   │   ├── clientes.controller.ts
│   │   ├── clientes.service.ts
│   │   └── clientes.module.ts
│   │
│   └── reservas/                    # Proxy REST para reservas
│       ├── reservas.controller.ts
│       ├── reservas.service.ts
│       └── reservas.module.ts
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 🔧 Componentes Principales

### 1. **Main.ts** - Punto de Entrada

**Ubicación:** `src/main.ts`

**Responsabilidades:**
- Inicializar la aplicación NestJS
- Configurar CORS para permitir peticiones cross-origin
- Habilitar validación global de DTOs
- Configurar prefijo global `/api` para todas las rutas
- Iniciar servidor en puerto 3000

**Código clave:**
```typescript
app.setGlobalPrefix('api');
app.useGlobalPipes(new ValidationPipe());
app.enableCors();
await app.listen(3000);
```

---

### 2. **Procesador Service** - Orquestador Inteligente

**Ubicación:** `src/procesador/procesador.service.ts`

**Función:** Coordinar Gemini AI y el MCP Server para ejecutar solicitudes en lenguaje natural.

#### Flujo de Procesamiento:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario envía mensaje: "Crea reserva para Juan..."  │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Obtener herramientas disponibles del MCP Server      │
│    • buscar_cliente                                     │
│    • validar_disponibilidad                            │
│    • crear_reserva                                      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Gemini AI analiza y decide qué herramientas usar    │
│    • Extrae información del mensaje                     │
│    • Determina secuencia de ejecución                  │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Ejecutar herramientas secuencialmente               │
│    a) buscar_cliente (nombre: "Juan")                  │
│    b) validar_disponibilidad (fecha solicitada)        │
│    c) crear_reserva (con datos obtenidos)              │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Gemini genera respuesta en lenguaje natural         │
│    "Reserva creada exitosamente para Juan Pérez..."    │
└─────────────────────────────────────────────────────────┘
```

#### Método Principal: `procesarSolicitud()`

```typescript
async procesarSolicitud(mensaje: string): Promise<any> {
  // 1. Obtener herramientas del MCP Server
  const availableTools = await this.mcpClient.listTools();
  
  // 2. Consultar a Gemini AI
  const geminiResponse = await this.geminiService.processUserRequest(
    mensaje,
    availableTools
  );
  
  // 3. Si Gemini decide usar herramientas
  if (geminiResponse.type === 'function_calls') {
    // Ejecutar cada herramienta
    for (const functionCall of geminiResponse.functionCalls) {
      const result = await this.mcpClient.callTool(
        functionCall.name,
        functionCall.args
      );
      functionResults.push(result);
    }
    
    // 4. Generar respuesta final
    const finalResponse = await this.geminiService.continueConversation(
      geminiResponse.chat,
      functionResults
    );
    
    return { success: true, mensaje: finalResponse };
  }
}
```

---

### 3. **Gemini Service** - Integración con IA

**Ubicación:** `src/gemini/gemini.service.ts`

**Función:** Comunicarse con Gemini AI usando Function Calling.

#### Características:

**a) Inicialización:**
- Lee API Key desde variable de entorno `GEMINI_API_KEY`
- Configura modelo (gemini-pro, gemini-1.5-flash-latest, etc.)
- Parámetros de generación: temperatura, max tokens, topP, topK

**b) Conversión de Herramientas:**
```typescript
convertToolsToGeminiFormat(mcpTools: any[]): any[] {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: this.convertJsonSchemaToGemini(tool.inputSchema)
  }));
}
```

**c) Procesamiento de Solicitudes:**
```typescript
async processUserRequest(userMessage: string, availableTools: any[]) {
  const geminiTools = this.convertToolsToGeminiFormat(availableTools);
  
  const chat = this.model.startChat({
    tools: [{ functionDeclarations: geminiTools }]
  });
  
  const result = await chat.sendMessage(userMessage);
  const functionCalls = result.response.functionCalls();
  
  if (functionCalls && functionCalls.length > 0) {
    return { type: 'function_calls', functionCalls, chat };
  }
  
  return { type: 'text', text: result.response.text() };
}
```

**d) Continuación de Conversación:**
Después de ejecutar herramientas, envía resultados a Gemini para respuesta final:
```typescript
async continueConversation(chat: any, functionResults: any[]): Promise<string> {
  const result = await chat.sendMessage(functionResults);
  return result.response.text();
}
```

---

### 4. **MCP Client Service** - Comunicación JSON-RPC 2.0

**Ubicación:** `src/mcp-client/mcp-client.service.ts`

**Función:** Comunicarse con el MCP Server usando el protocolo JSON-RPC 2.0.

#### Métodos Principales:

**a) Listar Herramientas:**
```typescript
async listTools(): Promise<any[]> {
  const response = await this.httpService.post(mcpServerUrl, {
    jsonrpc: '2.0',
    method: 'tools/list',
    id: this.generateRequestId()
  });
  
  return response.data.result?.tools || [];
}
```

**b) Ejecutar Herramienta:**
```typescript
async callTool(toolName: string, toolArguments: any): Promise<any> {
  const response = await this.httpService.post(mcpServerUrl, {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: toolArguments
    },
    id: this.generateRequestId()
  });
  
  return response.data.result;
}
```

**c) Health Check:**
```typescript
async healthCheck(): Promise<boolean> {
  const response = await this.httpService.get(healthUrl);
  return response.data.status === 'ok';
}
```

---

### 5. **Controladores REST** - Endpoints Tradicionales

Además del endpoint inteligente con Gemini, el gateway expone endpoints REST tradicionales que actúan como proxy hacia los microservicios backend.

#### Clientes Controller
**Endpoints:**
- `GET /api/clientes` - Listar todos los clientes
- `POST /api/clientes` - Crear cliente
- `GET /api/clientes/:id` - Obtener cliente por ID
- `PATCH /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente (soft delete)

#### Reservas Controller
**Endpoints:**
- `GET /api/reservas` - Listar todas las reservas
- `POST /api/reservas` - Crear reserva
- `GET /api/reservas/:id` - Obtener reserva por ID
- `PATCH /api/reservas/:id/cancelar` - Cancelar reserva

---

## 🌐 Endpoints Principales

### 1. Endpoint Inteligente (MCP + Gemini)

#### **POST /api/procesador**

Procesa solicitudes en lenguaje natural.

**Request:**
```json
{
  "mensaje": "Crea una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10 AM"
}
```

**Response:**
```json
{
  "success": true,
  "mensaje": "He creado exitosamente una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10:00 AM. La reserva tiene una duración de 60 minutos y está confirmada.",
  "herramientasEjecutadas": [
    "buscar_cliente",
    "validar_disponibilidad",
    "crear_reserva"
  ],
  "resultados": [...]
}
```

**Ejemplos de mensajes aceptados:**
- "Busca el cliente con email juan@ejemplo.com"
- "¿Está disponible el 15 de febrero a las 3 PM?"
- "Crea una reserva para María el próximo viernes a las 2 PM"
- "Muéstrame los datos del cliente Juan Pérez"

---

#### **GET /api/procesador/estado**

Verifica el estado del sistema.

**Response:**
```json
{
  "mcpServer": "conectado",
  "geminiAI": "configurado",
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

---

## ⚙️ Variables de Entorno

```env
# Puerto del servicio
PORT=3000
NODE_ENV=development

# Conexión con MCP Server
MCP_SERVER_HOST=mcp-server
MCP_SERVER_PORT=3001

# Conexión con Backend
MICROSERVICIO_CLIENTES_HOST=backend-clientes
MICROSERVICIO_CLIENTES_PORT=3002
MICROSERVICIO_RESERVAS_HOST=backend-reservas
MICROSERVICIO_RESERVAS_PORT=3003

# Gemini AI (REQUERIDO)
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-pro
```

### Obtener API Key de Gemini:
1. Visitar: https://aistudio.google.com/app/apikey
2. Crear nueva API Key
3. Copiar y configurar en `.env`

---

## 🔄 Flujo de Datos Completo

```
1. Usuario envía petición HTTP
   POST /api/procesador
   { "mensaje": "Crea reserva para Juan..." }
                    ↓
2. ProcesadorController recibe request
   procesador.controller.ts
                    ↓
3. ProcesadorService coordina
   procesador.service.ts
                    ↓
4. McpClientService obtiene herramientas
   POST http://mcp-server:3001/rpc
   { "jsonrpc": "2.0", "method": "tools/list" }
                    ↓
5. GeminiService procesa mensaje
   Analiza: "Crea reserva para Juan..."
   Decide: [buscar_cliente, validar_disponibilidad, crear_reserva]
                    ↓
6. McpClientService ejecuta herramientas
   POST http://mcp-server:3001/rpc
   { "jsonrpc": "2.0", "method": "tools/call", "params": {...} }
                    ↓
7. MCP Server llama al Backend
   GET http://backend-clientes:3002/clientes/buscar
   GET http://backend-reservas:3003/reservas/validar
   POST http://backend-reservas:3003/reservas
                    ↓
8. Resultados regresan a Gemini
   GeminiService.continueConversation()
                    ↓
9. Respuesta final al usuario
   "Reserva creada exitosamente para Juan Pérez..."
```

---

## 🐛 Logs y Debugging

El API Gateway genera logs detallados en cada paso:

```
═══════════════════════════════════════════════════════
📨 NUEVA SOLICITUD DEL USUARIO
   Mensaje: "Crea una reserva para Juan el viernes..."
═══════════════════════════════════════════════════════

📋 Paso 1: Obteniendo herramientas del MCP Server...
   ✅ 3 herramientas disponibles

🤖 Paso 2: Consultando a Gemini AI...
   ✅ Respuesta recibida de Gemini

🔧 Paso 3: Gemini decidió ejecutar 3 herramienta(s)

   ⚙️  Ejecutando: buscar_cliente
      ✅ Resultado obtenido

   ⚙️  Ejecutando: validar_disponibilidad
      ✅ Resultado obtenido

   ⚙️  Ejecutando: crear_reserva
      ✅ Resultado obtenido

💬 Paso 4: Generando respuesta final con Gemini...

═══════════════════════════════════════════════════════
✅ PROCESAMIENTO COMPLETADO
═══════════════════════════════════════════════════════
```

---

## 🚀 Inicio y Despliegue

### Desarrollo Local

```bash
cd apps/api-gateway
npm install
npm run start:dev
```

### Docker

```bash
# Construir imagen
docker build -t api-gateway .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=tu_api_key \
  -e MCP_SERVER_HOST=mcp-server \
  api-gateway
```

### Docker Compose (Recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up api-gateway
```

---

## 🧪 Pruebas

### Verificar Estado
```bash
curl http://localhost:3000/api/procesador/estado
```

### Buscar Cliente
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Busca el cliente Juan Pérez"}'
```

### Validar Disponibilidad
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Está disponible el 30 de enero a las 10 AM?"}'
```

### Crear Reserva Completa
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Crea una reserva de masaje para María López el 15 de febrero a las 3 PM"}'
```

---

## ❗ Manejo de Errores

### Error: GEMINI_API_KEY no configurada
```
❌ GEMINI_API_KEY no está configurada en las variables de entorno
```
**Solución:** Configurar variable de entorno con API Key válida.

### Error: MCP Server desconectado
```
❌ No se pudo conectar con el MCP Server
```
**Solución:** Verificar que el MCP Server esté ejecutándose en el puerto 3001.

### Error: Backend no disponible
```
❌ No se pudo validar el cliente con ID X
```
**Solución:** Verificar que los microservicios backend estén ejecutándose.

---

## 📊 Ventajas del API Gateway

✅ **Abstracción de Complejidad:** El usuario no necesita conocer endpoints específicos  
✅ **Orquestación Inteligente:** Gemini decide automáticamente qué herramientas usar  
✅ **Lenguaje Natural:** Interfaz conversacional amigable  
✅ **Escalable:** Fácil agregar nuevas herramientas sin cambiar el código del gateway  
✅ **Manejo de Errores:** Gemini puede explicar errores en lenguaje natural  
✅ **Proxy REST:** Mantiene compatibilidad con clientes REST tradicionales  

---

## 🔮 Posibles Mejoras

- Implementar caché de respuestas de Gemini
- Agregar autenticación y autorización
- Implementar rate limiting
- Agregar métricas y observabilidad
- Soporte para conversaciones multi-turno
- Integrar con más modelos de IA (OpenAI, Claude, etc.)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0  
**Autor:** Sistema de Reservas MCP + Gemini

