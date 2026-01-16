# 🚀 Taller 3: Sistema de Reservas con MCP + Gemini AI

## 📋 Descripción

Sistema de reservas que integra **Model Context Protocol (MCP)** con **Gemini AI** para permitir la orquestación inteligente de servicios mediante lenguaje natural.

**Ejemplo:** *"Crea una reserva de corte de cabello para Juan Pérez el 30 de enero de 2026 a las 10 AM"*

El sistema automáticamente:
1. Busca al cliente Juan Pérez
2. Valida disponibilidad de la fecha
3. Crea la reserva
4. Responde en lenguaje natural

---

## 🏗️ Arquitectura (3 Capas)

```
Usuario: "Reserva para Juan el viernes a las 3 PM"
                    ↓
┌──────────────────────────────────────────────────┐
│ CAPA 1: API Gateway + Gemini (Puerto 3000)      │
│ • Recibe lenguaje natural                       │
│ • Gemini decide qué Tools usar                  │
└────────────────┬─────────────────────────────────┘
                 │ JSON-RPC 2.0
                 ↓
┌──────────────────────────────────────────────────┐
│ CAPA 2: MCP Server (Puerto 3001)                │
│ • buscar_cliente                                 │
│ • validar_disponibilidad                        │
│ • crear_reserva                                  │
└────────────────┬─────────────────────────────────┘
                 │ REST
                 ↓
┌──────────────────────────────────────────────────┐
│ CAPA 3: Backend (Puerto 3002)                   │
│ • Clientes (Entidad Maestro)                    │
│ • Reservas (Entidad Movimiento)                 │
│ • Base de datos SQLite                          │
└──────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto (Según Requisitos)

```
proyecto-mcp/
├── apps/
│   ├── backend/                    # Microservicios existentes
│   │   ├── clientes/
│   │   │   ├── src/
│   │   │   │   ├── clientes/      # Entidad Maestro
│   │   │   │   └── database/
│   │   │   └── data/
│   │   │       └── clientes.db    # SQLite
│   │   └── reservas/
│   │       ├── src/
│   │       │   ├── reservas/      # Entidad Movimiento
│   │       │   └── database/
│   │       └── data/
│   │           └── reservas.db    # SQLite
│   │
│   ├── mcp-server/                # Servidor MCP
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   │   ├── registry.ts
│   │   │   │   ├── buscar-cliente.tool.ts
│   │   │   │   ├── validar-disponibilidad.tool.ts
│   │   │   │   └── crear-reserva.tool.ts
│   │   │   ├── services/
│   │   │   │   └── backend-client.ts
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── api-gateway/               # Gateway con Gemini
│       ├── src/
│       │   ├── gemini/
│       │   ├── mcp-client/
│       │   └── procesador/
│       └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Inicio Rápido

### 1. Obtener API Key de Gemini (GRATIS)

https://aistudio.google.com/app/apikey

### 2. Configurar

Crear archivo `.env`:

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

### 3. Iniciar

```bash
docker-compose up --build
```

### 4. Verificar

```bash
curl http://localhost:3000/api/procesador/estado
```

---

## 🎯 Ejemplos de Uso

### Crear Cliente

```bash
curl -X POST http://localhost:3002/clientes \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Juan Perez\",\"email\":\"juan@ejemplo.com\",\"telefono\":\"123456789\"}"
```

### Usar Lenguaje Natural

**Buscar:**
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d "{\"mensaje\":\"Busca el cliente Juan Perez\"}"
```

**Validar:**
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d "{\"mensaje\":\"Esta disponible el 30 de enero de 2026 a las 10 AM?\"}"
```

**Crear Reserva:**
```bash
curl -X POST http://localhost:3000/api/procesador \
  -H "Content-Type: application/json" \
  -d "{\"mensaje\":\"Crea una reserva de corte de cabello para Juan Perez el 30 de enero de 2026 a las 10 AM\"}"
```

---

## 🔧 Tools Implementados

### 1. buscar_cliente (Tool de Búsqueda)
Busca clientes por ID, email o nombre.

### 2. validar_disponibilidad (Tool de Validación)
Valida si una fecha está disponible para reservar.

### 3. crear_reserva (Tool de Acción)
Crea una nueva reserva validando cliente y disponibilidad.

---

## 📊 Puertos (Según Requisitos del Taller)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API Gateway | 3000 | Gateway con Gemini AI |
| MCP Server | 3001 | Servidor JSON-RPC 2.0 |
| Backend | 3002 | Microservicio Clientes |
| Backend | 3003 | Microservicio Reservas |
| RabbitMQ | 15672 | Management UI |

---

## 🛠️ Stack Tecnológico (Según Requisitos)

| Componente | Tecnología | Puerto |
|------------|------------|--------|
| Backend | NestJS + TypeORM + **SQLite** | 3002 |
| MCP Server | TypeScript + Express + JSON-RPC | 3001 |
| API Gateway | NestJS + @google/generative-ai | 3000 |
| Modelo IA | Gemini 2.0 Flash (gratuito) | Cloud |

---

## 📝 Flujo de Ejecución

**Ejemplo:** "Quiero prestar el libro 'Clean Code' para Juan Pérez"

1. **Usuario** → API Gateway: Envía mensaje
2. **API Gateway** → Gemini: Consulta con Tools disponibles
3. **Gemini** decide: buscar_cliente → validar_disponibilidad → crear_reserva
4. **MCP Server**: Ejecuta cada Tool llamando al Backend REST
5. **Respuesta**: "Reserva creada exitosamente para Juan Pérez"

---

## 🧪 Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down

# Limpiar todo
docker-compose down -v
```

---

## 📦 Entregables del Taller

✅ 1. Repositorio Git con estructura especificada  
✅ 2. README.md con instrucciones completas  
✅ 3. Video demostrativo (3-5 minutos)  
✅ 4. Documentación de Tools  
✅ 5. Pruebas con Postman/Thunder Client  

---

## 🎓 Objetivos Cumplidos

✅ **Comprender MCP**: Orquestación inteligente de servicios  
✅ **Diseñar Tools**: 3 Tools con JSON Schema  
✅ **Implementar JSON-RPC 2.0**: Comunicación estandarizada  
✅ **Integrar Gemini**: Function Calling implementado  
✅ **Reutilizar código**: Microservicios de talleres anteriores  

---

## 🏆 Cumplimiento de Requisitos

### Base desde Talleres Anteriores
✅ 2 entidades relacionadas (Clientes-Reservas / Maestro-Movimiento)  
✅ Endpoints REST funcionales para CRUD  
✅ Base de datos **SQLite** operativa  

### MCP Server
✅ TypeScript + Express  
✅ JSON-RPC 2.0  
✅ 3 Tools: búsqueda, validación, acción  
✅ Puerto 3001  

### API Gateway
✅ NestJS + Gemini  
✅ Recibe texto del usuario  
✅ Consulta Tools al MCP Server  
✅ Ejecuta Tools automáticamente  
✅ Puerto 3000  

---

## 👨‍💻 Autor

**Taller 3 - MCP + Gemini AI**  
Aplicación para el Servidor Web  
ULEAM - Enero 2026
