# Imagen de la base de datos: PostgreSQL con el esquema y los datos de demo.
# Los scripts de /docker-entrypoint-initdb.d se ejecutan en orden alfabético,
# solo la primera vez (cuando el volumen de datos está vacío).
FROM postgres:16-alpine

ENV POSTGRES_USER=postgres \
    POSTGRES_DB=canchas

COPY empresas.sql /docker-entrypoint-initdb.d/01-empresas.sql
COPY canchas.sql  /docker-entrypoint-initdb.d/02-canchas.sql
COPY torneos.sql  /docker-entrypoint-initdb.d/03-torneos.sql
COPY gestion.sql  /docker-entrypoint-initdb.d/04-gestion.sql

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

EXPOSE 5432
