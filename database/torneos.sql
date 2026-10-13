-- Torneos y campeonatos que organiza cada complejo (fútbol o pádel).
--   torneo:     eliminación directa (el que pierde queda afuera)
--   campeonato: todos contra todos, con tabla de posiciones
-- Requiere empresas.sql y canchas.sql.

CREATE TABLE IF NOT EXISTS torneos (
    id_torneo SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('torneo', 'campeonato')),
    deporte VARCHAR(10) NOT NULL CHECK (deporte IN ('padel', 'futbol')),
    categoria VARCHAR(60),                 -- libre, +35, mixto, 4ta categoría...
    descripcion VARCHAR(500),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    cupo SMALLINT NOT NULL CHECK (cupo BETWEEN 2 AND 64),
    precio_inscripcion NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (precio_inscripcion >= 0),
    premio VARCHAR(150),
    estado VARCHAR(12) NOT NULL DEFAULT 'inscripcion'
        CHECK (estado IN ('inscripcion', 'en_curso', 'finalizado', 'cancelado')),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_torneos_empresa ON torneos (id_empresa);

-- Equipos (fútbol) o parejas (pádel) inscriptos
CREATE TABLE IF NOT EXISTS equipos (
    id_equipo SERIAL PRIMARY KEY,
    id_torneo INT NOT NULL REFERENCES torneos(id_torneo) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(30),
    integrantes VARCHAR(500),
    id_cliente INT REFERENCES clientes(id_cliente) ON DELETE SET NULL,  -- si lo inscribió un cliente
    fecha_inscripcion TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_torneo, nombre),
    UNIQUE (id_equipo, id_torneo)
);

CREATE TABLE IF NOT EXISTS partidos (
    id_partido SERIAL PRIMARY KEY,
    id_torneo INT NOT NULL REFERENCES torneos(id_torneo) ON DELETE CASCADE,
    ronda SMALLINT NOT NULL CHECK (ronda >= 1),        -- fecha (campeonato) o ronda (torneo)
    id_local INT NOT NULL,
    id_visitante INT,                                  -- NULL = queda libre y pasa de ronda
    resultado_local SMALLINT CHECK (resultado_local >= 0),       -- goles o sets
    resultado_visitante SMALLINT CHECK (resultado_visitante >= 0),
    id_cancha INT REFERENCES canchas(id_cancha) ON DELETE SET NULL,
    fecha DATE,
    hora TIME,
    estado VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'jugado')),
    -- Los dos equipos tienen que ser del MISMO torneo
    FOREIGN KEY (id_local, id_torneo) REFERENCES equipos(id_equipo, id_torneo) ON DELETE CASCADE,
    FOREIGN KEY (id_visitante, id_torneo) REFERENCES equipos(id_equipo, id_torneo) ON DELETE CASCADE,
    CHECK (id_visitante IS NULL OR id_visitante <> id_local)
);

CREATE INDEX IF NOT EXISTS idx_partidos_torneo ON partidos (id_torneo, ronda);

-- Un partido programado ocupa la cancha: se guarda como un turno más, así
-- ningún cliente puede reservar ese horario.
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS
    id_partido INT UNIQUE REFERENCES partidos(id_partido) ON DELETE CASCADE;

-- Datos de prueba
INSERT INTO torneos (id_empresa, nombre, tipo, deporte, categoria, descripcion, fecha_inicio, cupo, precio_inscripcion, premio) VALUES
(1, 'Liga de Primavera', 'campeonato', 'futbol', 'Libre', 'Fútbol 5, todos contra todos. Se juega los sábados.', CURRENT_DATE + 7, 8, 60000, 'Trofeo + camisetas'),
(2, 'Copa Pádel Norte', 'torneo', 'padel', '4ta categoría', 'Eliminación directa, parejas.', CURRENT_DATE + 10, 8, 20000, 'Paletas para la pareja campeona');

INSERT INTO equipos (id_torneo, nombre, contacto_nombre, contacto_telefono, integrantes) VALUES
(1, 'Los Pibes FC', 'Juan Pérez', '351-6000001', 'Juan, Pedro, Nico, Tomás, Leo'),
(1, 'Deportivo Asado', 'Carlos Ruiz', '351-6000002', NULL),
(1, 'La Scaloneta', 'Matías Díaz', '351-6000003', NULL),
(1, 'Atlético Birra', 'Franco López', '351-6000004', NULL),
(2, 'Gómez / Pérez', 'Lucas Gómez', '351-5550001', 'Lucas Gómez, Martina Pérez'),
(2, 'Rodríguez / Sosa', 'Sofía Rodríguez', '351-5550003', 'Sofía Rodríguez, Ana Sosa'),
(2, 'Ferreyra / Luna', 'Diego Ferreyra', '351-6000005', NULL);
