# 📮 Ejemplos JSON para Postman - Sistema de Reservas de Eventos

Esta guía contiene todos los JSON listos para copiar y pegar en Postman (Body → raw → JSON)

---

## 📋 ÍNDICE RÁPIDO

1. [Verificación de Servicios (GET)](#1-verificación-de-servicios)
2. [Crear Clientes (POST)](#2-crear-clientes---organizadores-de-eventos)
3. [MCP Server - JSON-RPC (POST)](#3-mcp-server---json-rpc-20)
4. [Gemini AI - Lenguaje Natural (POST)](#4-gemini-ai---lenguaje-natural)
5. [Casos de Uso Completos](#5-casos-de-uso-completos)
6. [Idempotencia (POST)](#6-pruebas-de-idempotencia)
7. [Manejo de Errores](#7-manejo-de-errores)

---

## 1️⃣ Verificación de Servicios

### 1.1 Health Check - API Gateway
```
GET http://localhost:3000/api/procesador/estado
```
**Body:** ninguno (GET request)

---

### 1.2 Health Check - MCP Server
```
GET http://localhost:3001/health
```
**Body:** ninguno (GET request)

---

### 1.3 Listar Tools Disponibles
```
GET http://localhost:3001/tools
```
**Body:** ninguno (GET request)

---

### 1.4 Listar Clientes
```
GET http://localhost:3002/clientes
```
**Body:** ninguno (GET request)

---

### 1.5 Listar Reservas
```
GET http://localhost:3003/reservas
```
**Body:** ninguno (GET request)

---

## 2️⃣ Crear Clientes - Organizadores de Eventos

### 2.1 Crear Cliente - TechCorp (Eventos Corporativos)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "TechCorp S.A.",
  "email": "eventos@techcorp.com",
  "telefono": "+57 300 456 7890"
}
```

---

### 2.2 Crear Cliente - María González (Organizadora de Bodas)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Maria Gonzalez - Bodas Elegantes",
  "email": "maria.bodas@gmail.com",
  "telefono": "+57 301 789 4561"
}
```

---

### 2.3 Crear Cliente - Carlos Méndez (Fiestas Infantiles)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Carlos Mendez - Eventos Kids",
  "email": "carlos.kids@eventos.com",
  "telefono": "+57 302 234 5678"
}
```

---

### 2.4 Crear Cliente - Universidad Nacional (Graduaciones)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Universidad Nacional - Dept Eventos",
  "email": "eventos@unacional.edu.co",
  "telefono": "+57 303 890 1234"
}
```

---

### 2.5 Crear Cliente - Restaurant El Gourmet (Cenas Privadas)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Restaurant El Gourmet",
  "email": "reservas@elgourmet.com",
  "telefono": "+57 304 567 8901"
}
```

---

### 2.6 Crear Cliente - Ana Ramírez (Quinceañera)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Ana Ramirez - Familia",
  "email": "ana.ramirez@hotmail.com",
  "telefono": "+57 305 123 4567"
}
```

---

### 2.7 Crear Cliente - Isabella Martínez (Bodas Premium)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Isabella Martinez - Bodas de Ensueño",
  "email": "isabella.bodas@premium.com",
  "telefono": "+57 320 888 9999"
}
```

---

### 2.8 Crear Cliente - GlobalTech Industries (Conferencias)
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "GlobalTech Industries",
  "email": "eventos@globaltech.com",
  "telefono": "+57 310 777 8888"
}
```

---

## 3️⃣ MCP Server - JSON-RPC 2.0

### 3.1 Listar Tools Disponibles (JSON-RPC)
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

---

### 3.2 Tool: buscar_cliente por ID
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_cliente",
    "arguments": {
      "id": 1
    }
  },
  "id": 2
}
```

---

### 3.3 Tool: buscar_cliente por nombre
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_cliente",
    "arguments": {
      "nombre": "TechCorp"
    }
  },
  "id": 3
}
```

---

### 3.4 Tool: buscar_cliente por email
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_cliente",
    "arguments": {
      "email": "maria.bodas@gmail.com"
    }
  },
  "id": 4
}
```

---

### 3.5 Tool: validar_disponibilidad
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "validar_disponibilidad",
    "arguments": {
      "fechaReserva": "2026-03-15T09:00:00Z",
      "duracionMinutos": 480
    }
  },
  "id": 5
}
```

---

### 3.6 Tool: crear_reserva (Conferencia Corporativa)
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "crear_reserva",
    "arguments": {
      "clienteId": 1,
      "servicioNombre": "Conferencia Anual TechCorp - Salon Principal",
      "fechaReserva": "2026-03-15T09:00:00Z",
      "duracionMinutos": 480,
      "notas": "Requiere proyector 4K, sonido profesional y coffee break para 150 personas"
    }
  },
  "id": 6
}
```

---

## 4️⃣ Gemini AI - Lenguaje Natural

### 🔍 BÚSQUEDAS

#### 4.1 Buscar empresa TechCorp
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Busca el cliente TechCorp"
}
```

---

#### 4.2 Buscar organizadora de bodas por email
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Dame la información del cliente con email maria.bodas@gmail.com"
}
```

---

#### 4.3 Buscar todos los clientes de bodas
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Muéstrame todos los clientes que organizan bodas"
}
```

---

#### 4.4 Buscar Universidad Nacional
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Quién es el cliente Universidad Nacional?"
}
```

---

#### 4.5 Buscar clientes de eventos infantiles
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Muéstrame todos los clientes relacionados con eventos infantiles"
}
```

---

### ✅ VALIDAR DISPONIBILIDAD

#### 4.6 Validar disponibilidad para evento corporativo
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Está disponible el salón para el 15 de marzo de 2026 desde las 9 AM?"
}
```

---

#### 4.7 Validar disponibilidad para boda (sábado)
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Tenemos disponible el salón principal para una boda el sábado 20 de abril de 2026?"
}
```

---

#### 4.8 Validar disponibilidad fin de semana
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Hay disponibilidad para el próximo sábado por la noche?"
}
```

---

#### 4.9 Validar disponibilidad evento nocturno
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Puedo reservar para una fiesta el viernes 10 de mayo a las 8 PM?"
}
```

---

#### 4.10 Validar disponibilidad para graduación
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Verificar si está libre el 30 de junio de 2026 para ceremonia de graduación desde las 10 AM"
}
```

---

### 🎉 CREAR RESERVAS DE EVENTOS

#### 4.11 Reserva - Conferencia Corporativa TechCorp
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Crea una reserva para TechCorp para su conferencia anual el 15 de marzo de 2026 desde las 9 AM por 8 horas"
}
```

---

#### 4.12 Reserva - Boda Elegante
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Necesito reservar el salón principal para la boda de Maria Gonzalez el sábado 20 de abril de 2026 de 6 PM a 2 AM"
}
```

---

#### 4.13 Reserva - Fiesta Infantil con Decoración
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Quiero agendar una fiesta de cumpleaños infantil para Carlos Mendez el 8 de mayo de 2026 a las 3 PM por 4 horas con decoración de superhéroes"
}
```

---

#### 4.14 Reserva - Graduación Universitaria
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Reserva el salón para ceremonia de graduación de Universidad Nacional el 30 de junio de 2026 desde las 10 AM hasta las 4 PM"
}
```

---

#### 4.15 Reserva - Cena Ejecutiva VIP
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "El Restaurant El Gourmet necesita el salón VIP para cena ejecutiva el viernes 15 de febrero de 2026 a las 8 PM por 3 horas"
}
```

---

#### 4.16 Reserva - Quinceañera Temática
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Hola, quiero reservar para la quinceañera de Ana Ramirez el sábado 25 de julio de 2026 desde las 7 PM con temática de princesas"
}
```

---

#### 4.17 Reserva - Evento de Networking
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Agendar evento de networking empresarial para TechCorp el jueves 10 de abril de 2026 de 6 PM a 10 PM"
}
```

---

### 🔥 CONSULTAS COMPLEJAS

#### 4.18 Consultar eventos programados de un cliente
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Cuántos eventos tiene programados TechCorp?"
}
```

---

#### 4.19 Buscar cliente y crear reserva
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Quiero reservar un salón para evento corporativo de maria.bodas@gmail.com el 25 de marzo de 2026 desde las 6 PM"
}
```

---

#### 4.20 Validar y reservar si está disponible
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Hay espacio libre el 25 de marzo de 2026? Si está disponible, reserva para Maria Gonzalez a las 6 PM por 8 horas"
}
```

---

#### 4.21 Consulta general sobre organización de evento
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Hola, necesito organizar una fiesta de 15 años para el próximo mes, qué disponibilidad tienen?"
}
```

---

#### 4.22 Buscar y reservar con cliente específico
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Para el cliente Restaurant El Gourmet, necesito reservar una cena de gala el 14 de febrero de 2026 a las 8 PM"
}
```

---

#### 4.23 Consulta sobre capacidad del salón
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Necesito organizar un evento para 200 personas, tienen capacidad?"
}
```

---

#### 4.24 Consulta sobre servicios adicionales
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Para mi boda necesito saber si incluyen decoración, sonido y catering"
}
```

---

## 5️⃣ Casos de Uso Completos

### CASO 1: BODA ELEGANTE (Paso a Paso)

#### Paso 1: Crear Cliente Isabella Martínez
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "Isabella Martinez - Bodas de Ensueño",
  "email": "isabella.bodas@premium.com",
  "telefono": "+57 320 888 9999"
}
```

---

#### Paso 2: Buscar Cliente Isabella (con IA)
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Busca a Isabella Martinez"
}
```

---

#### Paso 3: Validar Disponibilidad para Boda (con IA)
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Está disponible el salón principal para el sábado 10 de mayo de 2026 todo el día?"
}
```

---

#### Paso 4: Crear Reserva Completa de Boda (con IA)
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Reserva el salón para Isabella Martinez para una boda elegante el 10 de mayo de 2026 desde las 5 PM por 10 horas con decoración floral y menú gourmet"
}
```

---

### CASO 2: CONFERENCIA CORPORATIVA (Paso a Paso)

#### Paso 1: Crear Cliente GlobalTech
```
POST http://localhost:3002/clientes
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "nombre": "GlobalTech Industries",
  "email": "eventos@globaltech.com",
  "telefono": "+57 310 777 8888"
}
```

---

#### Paso 2: Consulta Compleja (busca + valida)
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "GlobalTech Industries necesita realizar su conferencia anual. Tienen disponible el 20 de septiembre de 2026?"
}
```

---

#### Paso 3: Crear Reserva de Conferencia
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Reserva para GlobalTech su conferencia anual el 20 de septiembre de 2026 desde las 8 AM por 10 horas, requieren proyector 4K, sistema de sonido profesional y servicio de catering para 150 personas"
}
```

---

### CASO 3: QUINCEAÑERA COMPLETA

#### Flujo completo en una sola solicitud
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Hola, soy la mamá de Sofía y quiero organizar su fiesta de 15 años para el 18 de agosto de 2026. Necesito el salón desde las 7 PM y calculamos unas 6 horas. Vamos a tener música en vivo y queremos decoración en tonos rosado y dorado"
}
```

---

## 6️⃣ Pruebas de Idempotencia

### 6.1 Crear Reserva con Clave de Idempotencia (Primera vez)
```
POST http://localhost:3003/reservas
Content-Type: application/json
X-Idempotency-Key: boda-premium-001
```

**Body (JSON):**
```json
{
  "clienteId": 2,
  "servicioNombre": "Boda Premium - Salon Cristal",
  "fechaReserva": "2026-06-15T18:00:00Z",
  "duracionMinutos": 600
}
```

**Headers importantes:**
- `Content-Type: application/json`
- `X-Idempotency-Key: boda-premium-001`

---

### 6.2 Repetir Exactamente la Misma Reserva (Segunda vez)
```
POST http://localhost:3003/reservas
Content-Type: application/json
X-Idempotency-Key: boda-premium-001
```

**Body (JSON):** (El mismo que antes)
```json
{
  "clienteId": 2,
  "servicioNombre": "Boda Premium - Salon Cristal",
  "fechaReserva": "2026-06-15T18:00:00Z",
  "duracionMinutos": 600
}
```

**Resultado esperado:** Debe retornar la misma respuesta sin crear una nueva reserva

---

### 6.3 Reserva con Clave Diferente
```
POST http://localhost:3003/reservas
Content-Type: application/json
X-Idempotency-Key: conferencia-tech-002
```

**Body (JSON):**
```json
{
  "clienteId": 1,
  "servicioNombre": "Conferencia TechCorp - Salon VIP",
  "fechaReserva": "2026-04-10T09:00:00Z",
  "duracionMinutos": 480,
  "notas": "Requiere sistema de videoconferencia"
}
```

---

## 7️⃣ Manejo de Errores

### 7.1 Error: Cliente Inexistente
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Busca al cliente Eventos Fantasma S.A."
}
```

**Resultado esperado:** Error indicando que no se encontró el cliente

---

### 7.2 Error: Fecha Pasada
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Quiero reservar el salón para TechCorp el 1 de enero de 2020"
}
```

**Resultado esperado:** Error indicando que la fecha debe ser futura

---

### 7.3 Error: Conflicto de Fechas
```
POST http://localhost:3000/api/procesador
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "mensaje": "Verifica si el 15 de marzo de 2026 está disponible a las 9 AM"
}
```

**Resultado esperado:** Si ya hay una reserva, indicará que no está disponible

---

### 7.4 Error: Tool Inexistente (JSON-RPC)
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "cancelar_evento",
    "arguments": {}
  },
  "id": 99
}
```

**Resultado esperado:** Error JSON-RPC indicando que la herramienta no existe

---

### 7.5 Error: Parámetros Inválidos
```
POST http://localhost:3001/rpc
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "buscar_cliente",
    "arguments": {}
  },
  "id": 100
}
```

**Resultado esperado:** Error indicando que faltan parámetros requeridos

---

## 🎯 TIPS PARA USAR EN POSTMAN

### 1. Configurar Header Content-Type

Para todas las peticiones POST, asegúrate de tener:
```
Content-Type: application/json
```

En Postman:
1. Ve a la pestaña **Headers**
2. Agrega: `Content-Type` = `application/json`

---

### 2. Seleccionar formato RAW + JSON

1. Ve a la pestaña **Body**
2. Selecciona **raw**
3. En el dropdown de la derecha, selecciona **JSON**
4. Pega el JSON del ejemplo

---

### 3. Usar Variables de Entorno (Opcional)

Crea un Environment con:
```json
{
  "api_gateway": "http://localhost:3000",
  "mcp_server": "http://localhost:3001",
  "backend_clientes": "http://localhost:3002",
  "backend_reservas": "http://localhost:3003"
}
```

Luego usa: `{{api_gateway}}/api/procesador`

---

### 4. Guardar Responses

Después de ejecutar una request:
1. Haz clic en **Save Response**
2. Nombra el archivo
3. Útil para comparar resultados

---

### 5. Tests Automáticos

En la pestaña **Tests**, agrega:

```javascript
// Verificar status 200
pm.test("Status 200", function () {
    pm.response.to.have.status(200);
});

// Verificar que success sea true
pm.test("Success true", function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
});

// Guardar ID del cliente creado
if (pm.response.json().id) {
    pm.environment.set("cliente_id", pm.response.json().id);
}
```

---

## 📊 ORDEN RECOMENDADO PARA DEMOSTRACIÓN

### Demo Básica (5 minutos):

1. **Health Check - API Gateway** (verificar)
2. **Crear Cliente - TechCorp** (crear organizador)
3. **Buscar TechCorp** (Gemini AI)
4. **Reserva - Conferencia TechCorp** (crear evento)
5. **Listar Reservas** (verificar)

---

### Demo Completa (15 minutos):

1. **Health Check - API Gateway**
2. **Listar Tools Disponibles**
3. **Crear Cliente - TechCorp**
4. **Crear Cliente - María González**
5. **Tool: buscar_cliente por nombre** (JSON-RPC)
6. **Buscar TechCorp** (Gemini AI - comparar)
7. **Validar disponibilidad** (Gemini AI)
8. **Reserva - Conferencia** (Gemini AI)
9. **Reserva - Boda** (Gemini AI)
10. **Consultar eventos de TechCorp** (Gemini AI complejo)
11. **Crear Reserva con Idempotencia (1era vez)**
12. **Repetir Misma Reserva** (demostrar idempotencia)
13. **Listar Reservas** (verificar todo)
14. **Error - Cliente Inexistente** (manejo de errores)
15. **Error - Fecha Pasada** (manejo de errores)

---

## 🚀 ¡LISTO PARA USAR!

Ahora tienes **más de 50 ejemplos JSON** listos para copiar y pegar en Postman.

### Recuerda:
- ✅ Selecciona **Body → raw → JSON** en Postman
- ✅ Agrega header `Content-Type: application/json`
- ✅ Para idempotencia, agrega header `X-Idempotency-Key`
- ✅ Ejecuta **Verificación de Servicios** primero
- ✅ Crea **clientes** antes de hacer reservas

---

**¡Disfruta probando el sistema! 🎉**

