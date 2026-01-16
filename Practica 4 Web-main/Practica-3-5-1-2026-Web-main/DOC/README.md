# 📚 Documentación del Sistema de Reservas MCP + Gemini AI

Bienvenido a la documentación completa del sistema. Esta carpeta contiene documentación detallada de cada componente de la aplicación.

---

## 📖 Guía de Lectura

### ¿Por dónde empezar?

**Si eres nuevo en el proyecto:**
1. Comienza con **[0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md)** para entender la arquitectura completa
2. Luego lee la documentación específica del componente que te interese

**Si necesitas implementar algo:**
- Ve directamente al documento del componente específico
- Cada documento incluye ejemplos de código y comandos

**Si estás debuggeando:**
- Revisa la sección "Logs y Debugging" de cada documento
- Consulta "Manejo de Errores" para soluciones comunes

---

## 📑 Índice de Documentación

### [0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md) 🌟
**Vista general del sistema completo**

📋 Contenido:
- Arquitectura de 3 capas
- Descripción de todos los componentes
- Flujo de ejecución completo (con ejemplo paso a paso)
- Puertos y URLs de todos los servicios
- Variables de entorno
- Inicio del sistema (Docker Compose)
- Ejemplos de uso completos
- Tecnologías utilizadas
- Patrones implementados
- Características destacadas
- Métricas del sistema
- Posibles mejoras futuras

👥 **Recomendado para:** Todos (empezar aquí)

---

### [1-API-GATEWAY.md](./1-API-GATEWAY.md) 🚪
**API Gateway + Gemini AI**

📋 Contenido:
- Propósito y responsabilidades
- Estructura completa del código
- Componentes principales:
  - Main.ts (Punto de entrada)
  - Procesador Service (Orquestador)
  - Gemini Service (Integración con IA)
  - MCP Client Service (JSON-RPC)
  - Controladores REST (Proxy)
- Endpoints inteligentes vs tradicionales
- Variables de entorno (incluyendo GEMINI_API_KEY)
- Flujo de datos detallado
- Logs y debugging
- Ejemplos de pruebas con cURL
- Manejo de errores
- Ventajas del Gateway

👥 **Recomendado para:** Desarrolladores frontend, integradores de IA, arquitectos

---

### [2-MCP-SERVER.md](./2-MCP-SERVER.md) 🔧
**Servidor MCP (Model Context Protocol)**

📋 Contenido:
- Implementación de JSON-RPC 2.0
- Estructura de requests y responses
- Códigos de error estándar
- Endpoints del servidor (POST /rpc, GET /health)
- Tool Registry (registro de herramientas)
- Documentación completa de las 3 Tools:
  - **buscar_cliente** (búsqueda)
  - **validar_disponibilidad** (validación)
  - **crear_reserva** (acción)
- Backend Client (comunicación HTTP)
- Variables de entorno
- Flujo de ejecución completo
- Logs y debugging
- Cómo agregar nuevas herramientas (guía paso a paso)

👥 **Recomendado para:** Desarrolladores backend, integradores de herramientas MCP

---

### [3-BACKEND-CLIENTES.md](./3-BACKEND-CLIENTES.md) 👤
**Microservicio de Clientes (Entidad Maestro)**

📋 Contenido:
- Modelo de datos (Cliente Entity)
- Esquema de la tabla SQLite
- Service con toda la lógica de negocio:
  - Crear cliente
  - Obtener todos
  - Obtener por ID
  - Buscar por email
  - Buscar por nombre (búsqueda parcial)
  - Actualizar cliente
  - Eliminar cliente (soft delete)
- Controller con endpoints REST
- DTOs (CrearClienteDto, ActualizarClienteDto)
- Validaciones automáticas
- Configuración de base de datos SQLite
- Consultas SQL equivalentes
- Variables de entorno
- Flujo de datos (request → response)
- Logs y debugging
- Ejemplos de pruebas con cURL
- Características del microservicio

👥 **Recomendado para:** Desarrolladores backend, administradores de BD

---

### [4-BACKEND-RESERVAS.md](./4-BACKEND-RESERVAS.md) 📅
**Microservicio de Reservas (Entidad Movimiento)**

📋 Contenido:
- Modelo de datos (Reserva Entity)
- Estados de reserva (pendiente, confirmada, completada, cancelada)
- Esquema de la tabla SQLite
- Service con lógica de negocio:
  - Crear reserva (con idempotencia)
  - Validar disponibilidad
  - Obtener todas las reservas
  - Obtener por ID
  - Obtener por cliente
  - Cancelar reserva (soft delete)
- **Patrón Idempotent Consumer:**
  - ¿Por qué es necesario?
  - Implementación con Redis
  - Flujo de idempotencia detallado
  - Ejemplos de uso
- Validación de cliente vía HTTP
- Controller con endpoints REST
- DTOs (CrearReservaDto)
- Configuración de base de datos SQLite
- Variables de entorno (incluye Redis)
- Flujo completo: crear reserva (11 pasos)
- Logs y debugging
- Ejemplos de pruebas con cURL

👥 **Recomendado para:** Desarrolladores backend, arquitectos de sistemas distribuidos

---

## 🎯 Casos de Uso por Rol

### Para Desarrolladores Frontend
1. Leer **0-RESUMEN-GENERAL.md** (arquitectura)
2. Enfocarse en **1-API-GATEWAY.md** (endpoints disponibles)
3. Ver ejemplos de uso con cURL
4. Implementar llamadas desde tu aplicación

### Para Desarrolladores Backend
1. Leer **0-RESUMEN-GENERAL.md** (arquitectura)
2. Revisar **2-MCP-SERVER.md** (protocolo MCP)
3. Estudiar **3-BACKEND-CLIENTES.md** y **4-BACKEND-RESERVAS.md**
4. Entender patrones implementados (Idempotent Consumer, Soft Delete)

### Para Integradores de IA
1. Leer **0-RESUMEN-GENERAL.md** (flujo completo)
2. Enfocarse en **1-API-GATEWAY.md** (Gemini Service)
3. Revisar **2-MCP-SERVER.md** (estructura de Tools)
4. Entender cómo agregar nuevas herramientas

### Para Arquitectos
1. Leer **0-RESUMEN-GENERAL.md** (visión completa)
2. Revisar decisiones de arquitectura en cada documento
3. Evaluar patrones implementados
4. Considerar mejoras y escalabilidad

### Para DevOps
1. Leer **0-RESUMEN-GENERAL.md** (servicios y puertos)
2. Revisar variables de entorno en cada documento
3. Consultar secciones "Inicio y Despliegue"
4. Verificar configuraciones de Docker

---

## 🔍 Búsqueda Rápida

### ¿Cómo...?

**¿Cómo agregar una nueva herramienta MCP?**
→ [2-MCP-SERVER.md](./2-MCP-SERVER.md) - Sección "Cómo Agregar una Nueva Herramienta"

**¿Cómo funciona la idempotencia?**
→ [4-BACKEND-RESERVAS.md](./4-BACKEND-RESERVAS.md) - Sección "Idempotencia Service"

**¿Cómo se comunican los servicios?**
→ [0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md) - Sección "Flujo de Ejecución Completo"

**¿Cómo configurar Gemini AI?**
→ [1-API-GATEWAY.md](./1-API-GATEWAY.md) - Sección "Variables de Entorno"

**¿Cómo funciona el soft delete?**
→ [3-BACKEND-CLIENTES.md](./3-BACKEND-CLIENTES.md) - Método "Eliminar Cliente"

**¿Cómo validar disponibilidad?**
→ [4-BACKEND-RESERVAS.md](./4-BACKEND-RESERVAS.md) - Método "Validar Disponibilidad"

**¿Qué puertos usa cada servicio?**
→ [0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md) - Sección "Puertos y URLs"

---

## 📊 Información por Documento

| Documento | Páginas | Secciones | Ejemplos de código |
|-----------|---------|-----------|-------------------|
| 0-RESUMEN-GENERAL.md | ~35 | 20+ | 15+ |
| 1-API-GATEWAY.md | ~30 | 15+ | 20+ |
| 2-MCP-SERVER.md | ~35 | 18+ | 25+ |
| 3-BACKEND-CLIENTES.md | ~25 | 12+ | 20+ |
| 4-BACKEND-RESERVAS.md | ~30 | 14+ | 20+ |

**Total:** ~155 páginas de documentación | 100+ ejemplos de código

---

## 🎨 Convenciones de la Documentación

### Emojis Utilizados
- 🎯 Propósito/Objetivo
- 🏗️ Arquitectura
- 📁 Estructura de archivos
- 🔧 Componentes/Herramientas
- 🌐 Endpoints/URLs
- ⚙️ Configuración
- 🔄 Flujo de datos
- 🐛 Debugging/Logs
- 🚀 Inicio/Despliegue
- 🧪 Pruebas/Testing
- ❗ Errores/Advertencias
- 📊 Características/Métricas
- 🔮 Mejoras futuras
- 📚 Referencias/Documentación
- ✅ Cumplimiento/Checklist
- 👥 Audiencia/Roles

### Bloques de Código
```typescript
// Código TypeScript con sintaxis resaltada
```

```bash
# Comandos de terminal
```

```json
// Ejemplos de JSON
```

### Secciones Estándar
Cada documento incluye:
1. **Propósito** - ¿Qué hace este componente?
2. **Arquitectura** - ¿Cómo se integra?
3. **Estructura del Código** - Organización de archivos
4. **Componentes Principales** - Explicación detallada
5. **Variables de Entorno** - Configuración
6. **Flujo de Datos** - ¿Cómo funciona?
7. **Logs y Debugging** - Solución de problemas
8. **Inicio y Despliegue** - Cómo ejecutar
9. **Pruebas** - Ejemplos prácticos
10. **Manejo de Errores** - Soluciones comunes

---

## 💡 Tips para Aprovechar la Documentación

1. **Usa Ctrl+F** para buscar términos específicos
2. **Sigue los enlaces** entre documentos para profundizar
3. **Copia y pega** los ejemplos de código para probar
4. **Revisa los logs** cuando algo no funcione
5. **Consulta el flujo de ejecución** para entender el contexto completo

---

## 🔄 Actualizaciones

Esta documentación se mantiene sincronizada con el código. Última actualización: **Enero 2026**

Si encuentras alguna inconsistencia o deseas contribuir:
1. Revisa el código fuente correspondiente
2. Verifica la versión del documento
3. Propón mejoras o correcciones

---

## 📞 Siguiente Paso

**¿Listo para empezar?**

👉 Comienza leyendo **[0-RESUMEN-GENERAL.md](./0-RESUMEN-GENERAL.md)**

---

## 📝 Checklist de Lectura

Marca lo que ya has leído:

- [ ] 0-RESUMEN-GENERAL.md - Vista general
- [ ] 1-API-GATEWAY.md - Gateway + Gemini AI
- [ ] 2-MCP-SERVER.md - Servidor MCP
- [ ] 3-BACKEND-CLIENTES.md - Microservicio Clientes
- [ ] 4-BACKEND-RESERVAS.md - Microservicio Reservas

---

**¡Feliz lectura! 🚀**

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0

