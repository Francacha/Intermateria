-- Gestión diaria del complejo, según la entrevista al dueño:
--   encargados:   usuarios del complejo que no son el dueño (toman reservas y cobran)
--   turnos_fijos: grupos que juegan siempre el mismo día y horario
--   pagos:        cada seña o saldo cobrado, con su medio de pago
--   cierres:      canchas cerradas por lluvia o mantenimiento
-- Además: precio nocturno, reglas de seña y cancelación, inasistencias e
-- incomparecencias en torneos.
--
-- Requiere empresas.sql, canchas.sql y torneos.sql. Se puede ejecutar sobre una
-- base que ya tiene datos: solo agrega lo que falta.

-- ---------- Reglas del complejo (las decide el dueño) ----------
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS porcentaje_sena SMALLINT NOT NULL DEFAULT 50;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS horas_cancelacion SMALLINT NOT NULL DEFAULT 24;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS hora_noche TIME NOT NULL DEFAULT '19:00';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS datos_transferencia VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_reglas_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_reglas_check
    CHECK (porcentaje_sena BETWEEN 0 AND 100 AND horas_cancelacion BETWEEN 0 AND 168);

-- ---------- Precio nocturno ----------
-- precio_hora rige de día; desde perfiles.hora_noche rige precio_hora_noche
-- (NULL = el mismo precio todo el día)
ALTER TABLE canchas ADD COLUMN IF NOT EXISTS precio_hora_noche NUMERIC(10, 2);
ALTER TABLE canchas DROP CONSTRAINT IF EXISTS canchas_precio_noche_check;
ALTER TABLE canchas ADD CONSTRAINT canchas_precio_noche_check CHECK (precio_hora_noche >= 0);

-- ---------- Encargados ----------
CREATE TABLE IF NOT EXISTS encargados (
    id_encargado SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    turno VARCHAR(40),                     -- "Mañana", "Tarde y noche"...
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Turnos fijos ----------
-- Cada semana se guarda como un turno más en reservas (id_turno_fijo), así el
-- EXCLUDE de reservas también los protege. La API los genera con 67 días de
-- anticipación: más que los 60 con los que puede reservar un jugador.
CREATE TABLE IF NOT EXISTS turnos_fijos (
    id_turno_fijo SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_cancha INT NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),   -- 1 = lunes
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    contacto_nombre VARCHAR(100) NOT NULL,
    contacto_telefono VARCHAR(30),
    desde DATE NOT NULL,
    hasta DATE,                            -- NULL = sin fecha de fin
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (hora_fin > hora_inicio),
    FOREIGN KEY (id_cancha, id_empresa) REFERENCES canchas(id_cancha, id_empresa) ON DELETE CASCADE
);

-- ---------- Reservas: inasistencia, cancelación y turno fijo ----------
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_estado_check
    CHECK (estado IN ('reservada', 'confirmada', 'jugada', 'ausente', 'cancelada'));

ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelada_en TIMESTAMPTZ;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS cancelada_por VARCHAR(10);
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(200);
-- Qué pasó con la seña al cancelar o faltar:
--   sin_sena: no había pagado seña · perdida: canceló tarde o no vino
--   a_resolver: canceló a tiempo o canceló el complejo · devuelta · a_favor: le queda para otro turno
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS resultado_sena VARCHAR(12);
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_cancelacion_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_cancelacion_check CHECK (
    (cancelada_por IS NULL OR cancelada_por IN ('cliente', 'complejo'))
    AND (resultado_sena IS NULL OR resultado_sena IN ('sin_sena', 'perdida', 'a_resolver', 'devuelta', 'a_favor'))
);

ALTER TABLE reservas ADD COLUMN IF NOT EXISTS
    id_turno_fijo INT REFERENCES turnos_fijos(id_turno_fijo) ON DELETE SET NULL;
-- Una sola fecha por turno fijo (aunque esa semana se haya liberado)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_turno_fijo_fecha ON reservas (id_turno_fijo, fecha);

-- ---------- Pagos ----------
CREATE TABLE IF NOT EXISTS pagos (
    id_pago SERIAL PRIMARY KEY,
    id_reserva INT NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    id_empresa INT NOT NULL REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    tipo VARCHAR(5) NOT NULL CHECK (tipo IN ('sena', 'saldo')),
    medio VARCHAR(15) NOT NULL CHECK (medio IN ('transferencia', 'efectivo')),
    monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    registrado_por VARCHAR(100),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON pagos (id_reserva);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa_fecha ON pagos (id_empresa, fecha_hora);

-- Las bases anteriores guardaban la seña en reservas.sena: pasa a ser un pago
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas' AND column_name = 'sena') THEN
        INSERT INTO pagos (id_reserva, id_empresa, tipo, medio, monto, registrado_por, fecha_hora)
        SELECT id_reserva, id_empresa, 'sena', 'transferencia', sena, 'Migración', fecha_creacion
          FROM reservas WHERE sena > 0;
        ALTER TABLE reservas DROP COLUMN sena;
    END IF;
END $$;

-- ---------- Cierres de canchas ----------
-- Puede durar unas horas (lluvia) o varios días (mantenimiento)
CREATE TABLE IF NOT EXISTS cierres (
    id_cierre SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_cancha INT NOT NULL,
    desde TIMESTAMP NOT NULL,
    hasta TIMESTAMP NOT NULL,
    motivo VARCHAR(15) NOT NULL CHECK (motivo IN ('lluvia', 'mantenimiento', 'otro')),
    detalle VARCHAR(200),
    registrado_por VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (hasta > desde),
    FOREIGN KEY (id_cancha, id_empresa) REFERENCES canchas(id_cancha, id_empresa) ON DELETE CASCADE,
    EXCLUDE USING gist (id_cancha WITH =, tsrange(desde, hasta) WITH &&)
);

-- ---------- Torneos: incomparecencia ----------
-- Equipo que no se presentó: pierde el partido (regla del dueño)
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS incomparecencia INT;
ALTER TABLE partidos DROP CONSTRAINT IF EXISTS partidos_incomparecencia_check;
ALTER TABLE partidos ADD CONSTRAINT partidos_incomparecencia_check
    CHECK (incomparecencia IS NULL OR incomparecencia = id_local OR incomparecencia = id_visitante);

-- ---------- Datos de prueba ----------
-- Precio nocturno de las canchas de demo
UPDATE canchas SET precio_hora_noche = precio_hora * 1.2
 WHERE precio_hora_noche IS NULL AND id_empresa IN (1, 2, 3);

-- Encargados de demo (contraseña demo1234)
INSERT INTO encargados (id_empresa, nombre, email, password_hash, turno) VALUES
(1, 'Martín (mañana)', 'manana@eventosdelcentro.com', '$2b$10$qjJoUHwz8Yy/BVUjLxY.bOjnfAmUdxASdtRwXhpM2zxMDm/vKTeqy', 'Mañana'),
(1, 'Julieta (tarde-noche)', 'noche@eventosdelcentro.com', '$2b$10$qjJoUHwz8Yy/BVUjLxY.bOjnfAmUdxASdtRwXhpM2zxMDm/vKTeqy', 'Tarde y noche')
ON CONFLICT (email) DO NOTHING;

-- Un turno fijo de demo: los miércoles de 20 a 21 en Fútbol 1 (la API genera las fechas)
INSERT INTO turnos_fijos (id_empresa, id_cancha, dia_semana, hora_inicio, hora_fin, precio, contacto_nombre, contacto_telefono, desde)
SELECT 1, 1, 3, '20:00', '21:00', 36000, 'Los del miércoles (Diego)', '351-5550010', CURRENT_DATE
 WHERE NOT EXISTS (SELECT 1 FROM turnos_fijos);

-- Seña de demo en el primer turno reservado
INSERT INTO pagos (id_reserva, id_empresa, tipo, medio, monto, registrado_por)
SELECT r.id_reserva, r.id_empresa, 'sena', 'transferencia', ROUND(r.precio_total / 2), 'Martín (mañana)'
  FROM reservas r
 WHERE r.id_empresa = 1 AND r.id_partido IS NULL AND r.id_turno_fijo IS NULL
   AND NOT EXISTS (SELECT 1 FROM pagos)
 ORDER BY r.id_reserva LIMIT 1;
