FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Construir aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start:prod"]
