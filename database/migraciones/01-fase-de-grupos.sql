-- Agrega el formato "grupos" (fase de grupos + eliminación directa) a una base
-- que ya existía. En una base nueva no hace falta: torneos.sql ya lo trae.
-- Se puede correr más de una vez.
--   docker exec -i canchas-db psql -U postgres -d canchas < database/migraciones/01-fase-de-grupos.sql

ALTER TABLE torneos DROP CONSTRAINT IF EXISTS torneos_tipo_check;
ALTER TABLE torneos ADD CONSTRAINT torneos_tipo_check CHECK (tipo IN ('torneo', 'campeonato', 'grupos'));

ALTER TABLE torneos ADD COLUMN IF NOT EXISTS cantidad_grupos SMALLINT CHECK (cantidad_grupos BETWEEN 2 AND 8);
ALTER TABLE torneos ADD COLUMN IF NOT EXISTS clasifican_por_grupo SMALLINT CHECK (clasifican_por_grupo >= 1);
ALTER TABLE torneos ADD COLUMN IF NOT EXISTS ida_vuelta BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE torneos DROP CONSTRAINT IF EXISTS torneos_grupos_check;
ALTER TABLE torneos ADD CONSTRAINT torneos_grupos_check
    CHECK (tipo <> 'grupos' OR (cantidad_grupos IS NOT NULL AND clasifican_por_grupo IS NOT NULL));

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS grupo CHAR(1) CHECK (grupo BETWEEN 'A' AND 'H');
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS grupo CHAR(1);
