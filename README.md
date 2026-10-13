# Reservas de canchas deportivas — API multitenant

Plataforma de canchas de **fútbol y pádel** con tres tipos de usuario:

| Rol | Qué hace |
| --- | --- |
| **Cliente** (jugador) | Se registra, ve **todos los complejos con sus canchas**, saca turnos en cualquiera (grilla de horarios libres), los cancela, e inscribe a su equipo/pareja en torneos. |
| **Empresa** (complejo) | Se registra indicando sus canchas y administra desde su panel: **agenda de turnos** (confirmar, marcar jugado, cancelar, seña, cargar turnos por teléfono), canchas, perfil (horarios = cuándo se puede reservar) y **torneos y campeonatos**. |
| **Administrador** | Gestiona las empresas: alta, edición, **baja/reactivación** (una empresa de baja no puede ingresar ni aparece en el sitio) y eliminación. |

**Torneos y campeonatos** (fútbol o pádel):
- **Torneo**: eliminación directa. Al cerrar la inscripción se sortea la llave (si
  los equipos no son potencia de 2, algunos pasan libres). Cuando se juega toda
  una ronda, la siguiente se arma sola con los ganadores, hasta la final.
- **Campeonato**: todos contra todos (método del círculo), con **tabla de
  posiciones** (3 pts ganado, 1 empate).
- Cada partido se puede programar en una cancha del complejo: queda guardado
  como un turno, así ningún cliente puede reservar ese horario.

Todo se guarda en **PostgreSQL** (única base de datos). API en Node.js +
Express, front en React, todo en Docker, replicado en 3 droplets de
DigitalOcean con **Nginx** como balanceador.

**Usuarios de demo**

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `admin@canchas.com` | `admin1234` |
| Empresa (fútbol) | `contacto@eventosdelcentro.com` | `demo1234` |
| Empresa (pádel) | `info@fiestasnorte.com` | `demo1234` |
| Empresa (ambos) | `hola@produccionessur.com` | `demo1234` |
| Cliente | `lucas@mail.com`, `sofia@mail.com` | `demo1234` |

Hay un único login: según el email, la API reconoce si es admin, empresa o
cliente y el front lleva a cada uno a su panel.

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
```

| Componente | Dónde | Función |
| --- | --- | --- |
| **Nginx** | Droplet 1 (Docker) | Único acceso público (puerto 80). Sirve el front y reparte `/api/` entre los 3 droplets (round-robin). |
| **API** | Droplets 1, 2 y 3 (Docker) | Misma imagen en los tres. Cada respuesta lleva la cabecera `X-Droplet`. |
| **PostgreSQL** | Droplet 1 (Docker) | Base única con todos los datos. Solo escucha en la IP privada. |

**Tablas** ([database/](database/), se cargan en orden al crear el contenedor):

| Script | Tablas |
| --- | --- |
| `empresas.sql` | `administradores`, `empresas`, `perfiles` (horarios en JSONB, servicios en TEXT[]) |
| `canchas.sql` | `canchas`, `clientes`, `reservas` (turnos) |
| `torneos.sql` | `torneos`, `equipos`, `partidos` |

Las contraseñas se guardan cifradas con bcrypt. Dos turnos superpuestos en la
misma cancha los rechaza la propia base (restricción `EXCLUDE` sobre un rango
de tiempo), así que vale aunque dos droplets intenten reservar a la vez; lo
mismo con el cupo de los torneos (`SELECT ... FOR UPDATE`).

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
cp .env.example .env     # completar IPs privadas, contraseña y JWT_SECRET
docker compose up -d --build
```

**Droplets 2 y 3** (nodos de la API):

```bash
cd deploy/droplet-nodo
cp .env.example .env     # DROPLET=droplet-2 (o droplet-3), IPs, contraseña, JWT_SECRET
docker compose up -d --build
```

Entrar a `http://<IP pública del droplet 1>`.

Firewall recomendado (Cloud Firewall de DigitalOcean): puerto 80 abierto a
todos en el droplet 1; puertos 3000 y 5432 solo desde la VPC; 22 para SSH.

## Prueba local (simula los 3 droplets en una máquina)

```bash
docker compose up -d --build     # usa docker-compose.yml de la raíz
```

Abrir http://localhost:8080.

Los scripts SQL solo se ejecutan cuando el volumen de PostgreSQL está vacío.
Si venías de una versión anterior (o querés volver a los datos de demo), borrá
el volumen: `docker compose down -v && docker compose up -d --build`. En el
droplet 1 lo mismo, dentro de `deploy/droplet-1`.

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

Las rutas marcadas con rol requieren `Authorization: Bearer <token>` de ese tipo de usuario.

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/api/instancia` | — | droplet que respondió |
| POST | `/api/auth/registro` | — | registro de complejo (empresa + canchas) |
| POST | `/api/auth/registro-cliente` | — | registro de jugador |
| POST | `/api/auth/login` | — | login único; devuelve token y usuario con su `rol` |
| GET | `/api/auth/sesion` | todos | usuario logueado |
| GET | `/api/publico/complejos?deporte=&q=` | — | complejos activos con sus canchas |
| GET | `/api/publico/complejos/:id` | — | ficha: perfil, canchas y torneos |
| GET | `/api/publico/canchas/:id/disponibilidad?fecha=` | — | horario del día y turnos ocupados |
| GET | `/api/publico/torneos`, `/api/publico/torneos/:id` | — | torneos, fixture, tabla y campeón |
| GET, POST | `/api/reservas` | cliente | mis turnos / reservar (`id_cancha, fecha, hora_inicio, duracion`) |
| PUT | `/api/reservas/:id/cancelar` | cliente | cancelar un turno que no empezó |
| GET, POST | `/api/inscripciones` | cliente | mis equipos / inscribir equipo en un torneo |
| DELETE | `/api/inscripciones/:id` | cliente | darse de baja (con la inscripción abierta) |
| GET, POST | `/api/canchas` | empresa | canchas del complejo |
| PUT, DELETE | `/api/canchas/:id` | empresa | solo canchas propias |
| GET, PUT | `/api/perfil` | empresa | perfil del complejo |
| GET | `/api/turnos?fecha=` | empresa | agenda del día |
| POST | `/api/turnos` | empresa | cargar turno a mano |
| PUT | `/api/turnos/:id` | empresa | cambiar estado o seña |
| GET, POST | `/api/torneos` | empresa | torneos del complejo / crear |
| GET, PUT, DELETE | `/api/torneos/:id` | empresa | ver, editar o cancelar (`estado: "cancelado"`), eliminar |
| POST, DELETE | `/api/torneos/:id/equipos[/:idEquipo]` | empresa | agregar / quitar equipo |
| POST | `/api/torneos/:id/fixture` | empresa | cerrar inscripción y armar fixture o llave |
| PUT | `/api/torneos/:id/partidos/:idPartido` | empresa | resultado y/o cancha, día y hora |
| GET | `/api/empresas`, `/api/empresas/resumen` | admin | empresas con su actividad / totales |
| GET, POST | `/api/empresas`, `/api/empresas/:id` | admin | ver / crear (con contraseña opcional) |
| PUT, DELETE | `/api/empresas/:id` | admin | editar, dar de baja (`activo: false`), eliminar |
