# Imagen de la API (Node.js + Express). Se usa la misma imagen para todas las réplicas.
FROM node:22-alpine

WORKDIR /app

# Primero solo las dependencias, para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
