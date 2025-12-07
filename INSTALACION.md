# Instrucciones de Instalación y Ejecución

## Requisitos Previos

- **Node.js**: v18 o superior
- **Docker**: v20 o superior
- **Docker Compose**: v2 o superior
- **npm**: v8 o superior

## Instalación Rápida con Docker

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd SegundoParcialServidorWeb
```

### 2. Iniciar todo el sistema

```bash
docker-compose up --build
```

Esto iniciará:
- RabbitMQ (puertos 5672, 15672)
- Redis (puerto 6379)
- PostgreSQL Clientes (puerto 5432)
- PostgreSQL Reservas (puerto 5433)
- Microservicio Clientes (puerto 3001)
- Microservicio Reservas (puerto 3002)
- API Gateway (puerto 3000)

### 3. Verificar que todos los servicios estén corriendo

```bash
docker-compose ps
```

Deberías ver todos los servicios con estado "Up".

### 4. Probar el sistema

```bash
# Crear un cliente
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "+58 412 1234567"
  }'

# Crear una reserva
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Consulta Médica",
    "fechaReserva": "2025-12-20T15:00:00Z",
    "duracionMinutos": 60
  }'
```

## Instalación para Desarrollo Local

### 1. Iniciar solo la infraestructura

```bash
docker-compose up rabbitmq redis db-clientes db-reservas
```

### 2. Instalar dependencias en cada microservicio

```bash
# Microservicio Clientes
cd microservicio-clientes
npm install
cd ..

# Microservicio Reservas
cd microservicio-reservas
npm install
cd ..

# API Gateway
cd api-gateway
npm install
cd ..
```

### 3. Copiar archivos de configuración

```bash
# Microservicio Clientes
cd microservicio-clientes
cp .env.example .env
cd ..

# Microservicio Reservas
cd microservicio-reservas
cp .env.example .env
cd ..

# API Gateway
cd api-gateway
cp .env.example .env
cd ..
```

### 4. Ejecutar cada microservicio en terminal separada

```bash
# Terminal 1 - Microservicio Clientes
cd microservicio-clientes
npm run start:dev

# Terminal 2 - Microservicio Reservas
cd microservicio-reservas
npm run start:dev

# Terminal 3 - API Gateway
cd api-gateway
npm run start:dev
```

## Acceso a Servicios

### API Gateway
- **URL**: http://localhost:3000/api
- **Documentación**: Ver README.md principal

### RabbitMQ Management
- **URL**: http://localhost:15672
- **Usuario**: admin
- **Contraseña**: admin123

### Bases de Datos

**PostgreSQL Clientes**
```bash
docker exec -it db-clientes psql -U admin -d clientes_db
```

**PostgreSQL Reservas**
```bash
docker exec -it db-reservas psql -U admin -d reservas_db
```

### Redis

```bash
docker exec -it redis redis-cli
```

## Comandos Útiles

### Ver logs de un servicio

```bash
docker-compose logs -f <nombre-servicio>

# Ejemplos:
docker-compose logs -f api-gateway
docker-compose logs -f microservicio-reservas
docker-compose logs -f rabbitmq
```

### Reiniciar un servicio

```bash
docker-compose restart <nombre-servicio>

# Ejemplo:
docker-compose restart microservicio-reservas
```

### Detener todo

```bash
docker-compose down
```

### Detener y eliminar volúmenes (⚠️ elimina datos)

```bash
docker-compose down -v
```

### Reconstruir un servicio específico

```bash
docker-compose up --build <nombre-servicio>

# Ejemplo:
docker-compose up --build microservicio-reservas
```

## Troubleshooting

### Error: Puerto ya en uso

Si algún puerto está ocupado, puedes modificar los puertos en `docker-compose.yml` o detener el proceso que está usando el puerto.

```bash
# En Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# En Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Error: No se puede conectar a RabbitMQ

Espera unos segundos a que RabbitMQ inicie completamente:

```bash
docker-compose logs rabbitmq
# Busca: "Server startup complete"
```

### Error: Base de datos no disponible

Verifica que los contenedores de PostgreSQL estén corriendo:

```bash
docker-compose ps db-clientes db-reservas
```

### Limpiar todo y empezar de nuevo

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Modo Producción

Para ejecutar en modo producción:

```bash
# 1. Modificar variables de entorno
# Editar archivos .env en cada microservicio

# 2. Ejecutar en modo detached
docker-compose up -d

# 3. Ver logs
docker-compose logs -f
```

## Pruebas de Idempotencia

### Enviar mensaje duplicado manualmente

```bash
# 1. Crear una reserva y guardar la respuesta
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": 1,
    "servicioNombre": "Consulta",
    "fechaReserva": "2025-12-25T10:00:00Z",
    "duracionMinutos": 30
  }'

# 2. Verificar en Redis que se guardó la clave
docker exec -it redis redis-cli
> KEYS idempotencia:*
> GET idempotencia:<UUID-de-la-reserva>

# 3. Reiniciar el servicio para simular fallo
docker-compose restart microservicio-reservas

# 4. El mensaje se reenviará automáticamente y se detectará como duplicado
docker-compose logs -f microservicio-reservas
```

## Preguntas Frecuentes

**¿Cómo sé si la idempotencia está funcionando?**
- Revisa los logs del microservicio de reservas
- Busca mensajes que digan "Mensaje duplicado detectado"
- Verifica las claves en Redis con `KEYS idempotencia:*`

**¿Cuánto tiempo se almacenan las claves de idempotencia?**
- Por defecto 24 horas (86400 segundos)
- Configurable con la variable `REDIS_TTL`

**¿Puedo usar Postman en lugar de curl?**
- Sí, importa el archivo `postman-collection.json`

**¿Cómo escalo los microservicios?**
```bash
docker-compose up --scale microservicio-reservas=3
```
