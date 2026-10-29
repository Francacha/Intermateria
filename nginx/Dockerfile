# Etapa 1: compilar el front (React + Vite)
FROM node:22-alpine AS build
WORKDIR /front
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# El front llama a /api en el mismo origen; Nginx lo deriva a los droplets
ENV VITE_API_URL=/api
RUN npm run build

# Etapa 2: Nginx sirve el front y balancea la API
FROM nginx:1.27-alpine
# nginx.conf es una plantilla: al arrancar, nodos.envsh arma ${SERVIDORES_API}
# con la lista NODOS y el resultado se escribe en /etc/nginx/nginx.conf
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
COPY nginx/nginx.conf /etc/nginx/templates/nginx.conf.template
COPY nginx/nodos.envsh /docker-entrypoint.d/15-nodos.envsh
RUN chmod +x /docker-entrypoint.d/15-nodos.envsh
COPY --from=build /front/dist /usr/share/nginx/html
EXPOSE 80
