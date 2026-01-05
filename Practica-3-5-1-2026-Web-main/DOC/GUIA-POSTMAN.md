# 📮 Guía de Postman - Sistema de Reservas para Local de Eventos

## 🎯 Importar la Colección

### Opción 1: Importar desde archivo

1. Abre **Postman**
2. Haz clic en **Import** (esquina superior izquierda)
3. Selecciona **Upload Files**
4. Navega a `DOC/POSTMAN-COLLECTION.json`
5. Haz clic en **Import**

### Opción 2: Arrastrar y soltar

1. Arrastra el archivo `POSTMAN-COLLECTION.json` directamente a la ventana de Postman
2. Confirma la importación

---

## 📁 Estructura de la Colección

La colección está organizada en **7 carpetas principales**:

```
Sistema de Reservas - Local de Eventos
├── 1️⃣ Verificación de Servicios (5 requests)
├── 2️⃣ Crear Clientes - Organizadores (6 requests)
├── 3️⃣ MCP Server - JSON-RPC 2.0 (5 requests)
├── 4️⃣ Gemini AI - Lenguaje Natural (17 requests)
│   ├── 🔍 Búsquedas (3 requests)
│   ├── ✅ Validar Disponibilidad (3 requests)
│   ├── 🎉 Crear Reservas de Eventos (6 requests)
│   └── 🔥 Consultas Complejas (3 requests)
├── 5️⃣ Casos de Uso Completos (8 requests)
│   ├── CASO 1: Boda Elegante (5 pasos)
│   └── CASO 2: Conferencia Corporativa (3 pasos)
├── 6️⃣ Pruebas de Idempotencia (2 requests)
└── 7️⃣ Manejo de Errores (3 requests)
```

**Total: 46 requests listos para usar**

---

## 🚀 Guía Rápida de Uso

### Paso 1: Verificar que todo funciona

Ejecuta **en orden** las peticiones de la carpeta **"1️⃣ Verificación de Servicios"**:

1. ✅ `Health Check - API Gateway` → Debe retornar `200 OK`
2. ✅ `Health Check - MCP Server` → Debe retornar estado `ok`
3. ✅ `Listar Tools Disponibles` → Debe mostrar 3 tools
4. ✅ `Listar Clientes Existentes` → Puede estar vacío inicialmente
5. ✅ `Listar Reservas Existentes` → Puede estar vacío inicialmente

### Paso 2: Crear clientes organizadores

Ejecuta las peticiones de la carpeta **"2️⃣ Crear Clientes"** (todas o algunas):

- `Crear Cliente - TechCorp (Corporativo)` → Para eventos corporativos
- `Crear Cliente - María González (Bodas)` → Para bodas
- `Crear Cliente - Carlos Méndez (Infantiles)` → Para fiestas infantiles
- `Crear Cliente - Universidad Nacional` → Para graduaciones
- `Crear Cliente - Restaurant El Gourmet` → Para cenas privadas
- `Crear Cliente - Ana Ramírez (Quinceañera)` → Para quinceañeras

### Paso 3: Probar MCP Server (Opcional - Técnico)

Si quieres ver cómo funciona el protocolo JSON-RPC directamente:

Carpeta **"3️⃣ MCP Server - JSON-RPC 2.0"**:
- `Listar Tools (JSON-RPC)` → Ver las 3 herramientas
- `Tool: buscar_cliente por ID` → Ejecutar tool directamente
- `Tool: validar_disponibilidad` → Validar fecha
- `Tool: crear_reserva (Conferencia)` → Crear reserva directamente

### Paso 4: Usar Gemini AI (¡Lo más interesante!)

Carpeta **"4️⃣ Gemini AI - Lenguaje Natural"**:

**🔍 Búsquedas:**
- Busca clientes usando lenguaje natural
- Ejemplos: "Busca el cliente TechCorp", "Muéstrame clientes que organizan bodas"

**✅ Validar Disponibilidad:**
- Consulta disponibilidad del salón
- Ejemplos: "Está disponible para boda el sábado 20 de abril de 2026?"

**🎉 Crear Reservas:**
- Crea reservas completas con lenguaje natural
- Ejemplos: 
  - "Crea reserva para conferencia TechCorp el 15 de marzo..."
  - "Necesito reservar boda de Maria Gonzalez el 20 de abril..."

**🔥 Consultas Complejas:**
- Gemini ejecutará múltiples tools automáticamente
- Ejemplos: "Cuántos eventos tiene TechCorp?", "Reserva si hay espacio..."

### Paso 5: Casos de uso completos

Carpeta **"5️⃣ Casos de Uso Completos"**:

**CASO 1: Boda Elegante** (Ejecutar en orden 1→5):
1. Crear Cliente Isabella
2. Buscar Cliente con IA
3. Validar Disponibilidad con IA
4. Crear Reserva Completa con IA
5. Verificar Reserva Creada

**CASO 2: Conferencia Corporativa** (Ejecutar en orden 1→3):
1. Crear Cliente GlobalTech
2. Consulta y Validación con IA
3. Crear Reserva Conferencia

---

## ⚙️ Configuración Importante

### Variables de Entorno (Opcional)

Puedes crear un **Environment** en Postman para facilitar el cambio de URLs:

```json
{
  "api_gateway_url": "http://localhost:3000",
  "mcp_server_url": "http://localhost:3001",
  "backend_clientes_url": "http://localhost:3002",
  "backend_reservas_url": "http://localhost:3003"
}
```

Luego cambias las URLs en las requests a:
- `{{api_gateway_url}}/api/procesador`
- `{{mcp_server_url}}/rpc`
- etc.

### GEMINI_API_KEY

⚠️ **IMPORTANTE**: Para usar las peticiones de Gemini AI (carpeta 4), necesitas:

1. Obtener tu API Key en: https://aistudio.google.com/app/apikey
2. Configurar en el archivo `.env` del proyecto:
   ```
   GEMINI_API_KEY=tu_clave_aqui
   ```
3. Reiniciar el API Gateway:
   ```bash
   docker-compose restart api-gateway
   ```

---

## 📊 Tipos de Requests

### GET - Consultas simples
- No requieren body
- Solo necesitas hacer clic en **Send**

### POST - Crear/Ejecutar
- Tienen un body JSON
- Puedes editar el JSON antes de enviar
- Asegúrate de que el header `Content-Type: application/json` esté presente

---

## 🎯 Ejemplos de Uso por Escenario

### Escenario 1: Cliente nuevo quiere reservar boda

```
1. Crear Cliente - María González (Bodas)
2. Buscar organizadora de bodas (Gemini AI)
3. Disponibilidad para boda (sábado) (Gemini AI)
4. Reserva - Boda Elegante (Gemini AI)
5. Listar Reservas Existentes (verificar)
```

### Escenario 2: Empresa quiere conferencia

```
1. Crear Cliente - TechCorp (Corporativo)
2. Buscar TechCorp (Gemini AI)
3. Disponibilidad para evento corporativo (Gemini AI)
4. Reserva - Conferencia TechCorp (Gemini AI)
5. Consulta - Eventos de TechCorp (ver todas sus reservas)
```

### Escenario 3: Quinceañera

```
1. Crear Cliente - Ana Ramírez (Quinceañera)
2. Disponibilidad evento nocturno (Gemini AI)
3. Reserva - Quinceañera (Gemini AI)
```

### Escenario 4: Probar idempotencia

```
1. Crear Reserva con Idempotencia (1era vez) → Crea nueva reserva
2. Repetir Misma Reserva → Retorna misma respuesta, NO crea duplicado
3. Listar Reservas → Verificar que solo hay 1 reserva
```

---

## 🔍 Interpretar Respuestas

### Respuesta exitosa de Gemini AI:

```json
{
  "success": true,
  "mensaje": "He creado exitosamente una reserva...",
  "herramientasEjecutadas": [
    "buscar_cliente",
    "validar_disponibilidad",
    "crear_reserva"
  ],
  "resultados": [...]
}
```

### Respuesta de búsqueda exitosa:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "TechCorp S.A.",
    "email": "eventos@techcorp.com",
    "telefono": "+57 300 456 7890",
    "activo": true
  }
}
```

### Respuesta de error:

```json
{
  "success": false,
  "error": "No se encontró cliente con ID 999"
}
```

---

## 🐛 Solución de Problemas en Postman

### Error: "Could not get response"
**Causa**: Servicio no está corriendo  
**Solución**: 
```bash
docker-compose ps  # Verificar servicios
docker-compose up -d  # Iniciar si están detenidos
```

### Error 500: "GEMINI_API_KEY no configurada"
**Causa**: API Key no está configurada  
**Solución**: Ver sección "GEMINI_API_KEY" arriba

### Error 404: "Cliente no encontrado"
**Causa**: El cliente no existe en la BD  
**Solución**: Ejecutar primero requests de "Crear Clientes"

### Error: "Fecha no disponible"
**Causa**: Ya hay una reserva en esa fecha  
**Solución**: 
1. Listar reservas existentes
2. Elegir otra fecha
3. O usar validar disponibilidad primero

---

## 💡 Tips y Trucos

### 1. Usar la consola de Postman
- Haz clic en "Console" (abajo) para ver detalles de la request/response
- Útil para debugging

### 2. Guardar respuestas
- Haz clic en "Save Response" para guardar una respuesta
- Útil para comparar resultados

### 3. Tests automáticos
Puedes agregar tests en la pestaña "Tests" de cada request:

```javascript
// Verificar que la respuesta sea 200
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Verificar que success sea true
pm.test("Success is true", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});
```

### 4. Orden recomendado para demostración

Para una demo completa en 10 minutos:

1. **Health Check - API Gateway** (verificar que funciona)
2. **Crear Cliente - TechCorp** (crear organizador)
3. **Listar Tools Disponibles** (mostrar las 3 tools)
4. **Tool: buscar_cliente por nombre** (JSON-RPC directo)
5. **Buscar TechCorp** (con Gemini AI - comparar con anterior)
6. **Disponibilidad para evento corporativo** (con Gemini AI)
7. **Reserva - Conferencia TechCorp** (crear reserva completa)
8. **Listar Reservas Existentes** (verificar creación)
9. **Crear Reserva con Idempotencia (1era vez)** (crear)
10. **Repetir Misma Reserva** (demostrar idempotencia)

---

## 📚 Recursos Adicionales

- **EJEMPLOS-CURL.txt**: Mismos ejemplos en formato curl
- **README.md**: Documentación completa del proyecto
- **DOC/0-RESUMEN-GENERAL.md**: Arquitectura del sistema
- **DOC/2-MCP-SERVER.md**: Documentación del MCP Server

---

## 🎉 ¡Listo para Usar!

Ahora tienes **46 requests** listas para probar todo el sistema de reservas de eventos.

### Orden sugerido de aprendizaje:

1. **Principiante**: Carpeta 1 y 2 (Verificación y Crear Clientes)
2. **Intermedio**: Carpeta 4 (Gemini AI - lo más impresionante)
3. **Avanzado**: Carpeta 3 (JSON-RPC directo)
4. **Experto**: Carpeta 5 (Casos completos)

---

**¡Disfruta probando el sistema! 🚀**

Si tienes dudas, revisa la documentación en `DOC/` o los logs con:
```bash
docker-compose logs -f api-gateway
docker-compose logs -f mcp-server
```

