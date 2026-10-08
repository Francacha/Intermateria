# Reservas de canchas deportivas — API multitenant

Plataforma donde distintos complejos deportivos (fútbol 5, pádel, tenis)
gestionan sus canchas, clientes y reservas. Cada complejo es una **empresa** y
trabaja solo con sus propios datos.

Cada complejo **se registra** indicando qué canchas maneja (pádel, fútbol o
ambas), **inicia sesión** y administra desde su panel sus canchas
(PostgreSQL) y el perfil del complejo (MongoDB). Incluye además el CRUD de
empresas de la consigna. API en Node.js + Express, front en React, todo en
Docker, replicado en 3 droplets de DigitalOcean con **Nginx** como balanceador.

**Usuarios de demo** (contraseña `demo1234`): `contacto@eventosdelcentro.com`
(fútbol), `info@fiestasnorte.com` (pádel), `hola@produccionessur.com` (ambos).

## Arquitectura

```
                        DROPLET 1 (acceso)                     DROPLET 2          DROPLET 3
                 ┌──────────────────────────────┐          ┌────────────┐     ┌────────────┐
 navegador ─:80─►│ nginx (front + balanceador)  │──────────► api        │     │ api        │
                 │   │            │             │─────────────────────────────► (droplet-3)│
                 │   ▼            │             │          │ (droplet-2)│     │            │
                 │ api (droplet-1)│             │          └─────┬──────┘     └─────┬──────┘
                 │   │            ▼             │                │                  │
                 │   └──────► PostgreSQL ◄──────┼────────────────┴──────────────────┘
                 └──────────────────────────────┘   red privada (VPC)
                          todas las APIs ──────► MongoDB Atlas (NoSQL, vía web)
```

| Componente | Dónde | Función |
| --- | --- | --- |
| **Nginx** | Droplet 1 (Docker) | Único acceso público (puerto 80). Sirve el front y reparte `/api/` entre los 3 droplets (round-robin). |
| **API** | Droplets 1, 2 y 3 (Docker) | Misma imagen en los tres. Cada respuesta lleva la cabecera `X-Droplet`. |
| **PostgreSQL** (SQL) | Droplet 1 (Docker) | Base única: `empresas` (con contraseña cifrada con bcrypt) y `canchas`. Solo escucha en la IP privada. |
| **MongoDB Atlas** (NoSQL) | Vía web | **Perfil de cada complejo**: descripción, servicios, horarios por día y redes. Cada complejo tiene datos distintos y sin estructura fija, por eso va en documentos. |

En el front, **el pie de página muestra qué droplet atendió** la última
petición (botón ↻ para volver a consultar).

**Sesión:** al registrarse o ingresar, la API devuelve un token JWT que el front
manda en cada petición. Como el token se valida con `JWT_SECRET` y no con una
sesión guardada en memoria, cualquier droplet puede atender a cualquier
usuario: por eso `JWT_SECRET` tiene que ser **el mismo en los 3 droplets**.

## Despliegue en los droplets

Requisitos: los 3 droplets en la **misma VPC** (red privada) y con Docker
instalado (`curl -fsSL https://get.docker.com | sh`). En cada uno:

```bash
git clone https://github.com/Francacha/Intermateria.git && cd Intermateria
```

**Droplet 1** (acceso + PostgreSQL):

```bash
cd deploy/droplet-1
cp .env.example .env     # completar IPs privadas, contraseña y MONGO_URI
docker compose up -d --build
```

**Droplets 2 y 3** (nodos de la API):

```bash
cd deploy/droplet-nodo
cp .env.example .env     # DROPLET=droplet-2 (o droplet-3), IPs, contraseña, MONGO_URI
docker compose up -d --build
```

Entrar a `http://<IP pública del droplet 1>`.

Firewall recomendado (Cloud Firewall de DigitalOcean): puerto 80 abierto a
todos en el droplet 1; puertos 3000 y 5432 solo desde la VPC; 22 para SSH.

En MongoDB Atlas, en *Network Access*, permitir las IPs públicas de los 3 droplets.

## Prueba local (simula los 3 droplets en una máquina)

```bash
docker compose up -d --build     # usa docker-compose.yml de la raíz
```

Abrir http://localhost:8080. En local, MongoDB Atlas se reemplaza por un
contenedor `mongo`, así que no hace falta conexión a internet.

Para borrar los datos y volver a cargar los scripts SQL:
`docker compose down -v && docker compose up -d --build`.

## Qué mostrar en la defensa

**1. Servicios en Docker** (en cada droplet):

```bash
docker ps                          # contenedores "Up"; canchas-db "healthy"
docker logs canchas-api            # "API en droplet-N corriendo en el puerto 3000"
```

**2. Docker Compose**:
- [docker-compose.yml](docker-compose.yml) — versión local: `x-api` define una
  vez la configuración de la API y `api1`, `api2`, `api3` la reutilizan
  (`<<: *api`), cambiando solo `DROPLET`. Red `red_canchas`, volumen
  `datos_postgres`, `healthcheck` para que las APIs esperen a PostgreSQL.
- [deploy/droplet-1/docker-compose.yml](deploy/droplet-1/docker-compose.yml) —
  Nginx + API + PostgreSQL. PostgreSQL publica el 5432 solo en la IP privada.
- [deploy/droplet-nodo/docker-compose.yml](deploy/droplet-nodo/docker-compose.yml) —
  solo la API; el mismo archivo para los droplets 2 y 3.

**3. Nginx** — [nginx/nginx.conf](nginx/nginx.conf):
- `upstream api_canchas` con un `server` por droplet. Algoritmo por defecto:
  **round-robin**. `zone` comparte el turno entre los procesos de Nginx (sin
  eso, cada proceso lleva su propio turno y casi todo cae en el nodo 1). `max_fails`/`fail_timeout` sacan de la rotación a un nodo caído.
- `location /api/` → `proxy_pass` al upstream; `proxy_next_upstream` reintenta
  en otro droplet si uno falla.
- `location /` sirve el front compilado (`try_files` para las rutas de React).
- `${NODO1..3}` se completan al arrancar con las variables del compose (la
  imagen oficial de Nginx hace `envsubst` sobre `/etc/nginx/templates`).

**Ver el balanceo en vivo**

- En el front: tocar **Consultar otra vez** en el pie → droplet-1, droplet-2, droplet-3...
- Por consola:

```bash
for i in 1 2 3 4 5 6; do curl -s http://<IP droplet 1>/api/instancia; echo; done
```

**Tolerancia a fallos**: `docker stop canchas-api` en el droplet 2 → el sistema
sigue respondiendo con los droplets 1 y 3. `docker start canchas-api` para volver.

## Desarrollo local (sin Docker)

```bash
cp .env.example .env && npm install && npm run dev       # API en :3001
cd front-eventos && cp .env.example .env && npm install && npm run dev
```

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/empresas` | 200 |
| GET | `/api/empresas/:id` | 200 / 404 |
| POST | `/api/empresas` | 201 / 400 |
| PUT | `/api/empresas/:id` | 200 / 404 |
| DELETE | `/api/empresas/:id` | 204 / 404 |
| GET | `/api/instancia` | 200 — droplet que respondió |
| POST | `/api/auth/registro` | 201 / 400 — crea empresa + canchas, devuelve token |
| POST | `/api/auth/login` | 200 / 401 |
| GET | `/api/auth/sesion` | 200 / 401 (requiere token) |
| GET, POST | `/api/canchas` | canchas del complejo logueado (requiere token) |
| PUT, DELETE | `/api/canchas/:id` | 200 / 204 / 404 (solo canchas propias) |
| GET, PUT | `/api/perfil` | perfil del complejo en MongoDB (requiere token) |
