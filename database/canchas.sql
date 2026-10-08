-- Sistema de reservas de canchas deportivas (multitenant)
-- Cada empresa es un complejo deportivo y solo trabaja con sus propios datos.
-- Requiere que exista la tabla empresas (database/empresas.sql).

-- Permite combinar "=" con rangos en una restricción EXCLUDE (ver reservas)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS canchas (
    id_cancha SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    deporte VARCHAR(10) NOT NULL CHECK (deporte IN ('padel', 'futbol')),
    jugadores SMALLINT,                    -- fútbol: 5, 7 u 11 por equipo; pádel: 4 en total
    superficie VARCHAR(30),                -- sintetico, cemento, cesped, blindex
    techada BOOLEAN DEFAULT FALSE,
    precio_hora NUMERIC(10, 2) NOT NULL CHECK (precio_hora >= 0),
    activa BOOLEAN DEFAULT TRUE,
    UNIQUE (id_empresa, nombre),
    UNIQUE (id_cancha, id_empresa)         -- para la FK compuesta de reservas
);

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    fecha_alta TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_empresa, telefono),         -- el mismo cliente puede estar en varios complejos
    UNIQUE (id_cliente, id_empresa)
);

CREATE TABLE IF NOT EXISTS reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_cancha INT NOT NULL,
    id_cliente INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'reservada'
        CHECK (estado IN ('reservada', 'confirmada', 'cancelada', 'jugada')),
    precio_total NUMERIC(10, 2) NOT NULL CHECK (precio_total >= 0),
    sena NUMERIC(10, 2) DEFAULT 0 CHECK (sena >= 0),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    CHECK (hora_fin > hora_inicio),
    -- FKs compuestas: la cancha y el cliente tienen que ser de la MISMA empresa
    FOREIGN KEY (id_cancha, id_empresa) REFERENCES canchas(id_cancha, id_empresa) ON DELETE CASCADE,
    FOREIGN KEY (id_cliente, id_empresa) REFERENCES clientes(id_cliente, id_empresa) ON DELETE CASCADE,
    -- Una cancha no puede tener dos reservas que se superpongan en el mismo día.
    -- La valida la base de datos, así que vale aunque dos réplicas de la API
    -- intenten reservar el mismo horario al mismo tiempo.
    EXCLUDE USING gist (
        id_cancha WITH =,
        tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
    ) WHERE (estado <> 'cancelada')
);

CREATE INDEX IF NOT EXISTS idx_reservas_empresa_fecha ON reservas (id_empresa, fecha);

-- Datos de prueba (usan las empresas 1, 2 y 3 de empresas.sql)
INSERT INTO canchas (id_empresa, nombre, deporte, jugadores, superficie, techada, precio_hora) VALUES
(1, 'Fútbol 1', 'futbol', 5, 'sintetico', FALSE, 30000),
(1, 'Fútbol 2', 'futbol', 5, 'sintetico', TRUE, 35000),
(1, 'Fútbol 3', 'futbol', 7, 'sintetico', FALSE, 45000),
(2, 'Pádel 1', 'padel', 4, 'blindex', TRUE, 20000),
(2, 'Pádel 2', 'padel', 4, 'blindex', TRUE, 20000),
(3, 'Fútbol 1', 'futbol', 5, 'sintetico', FALSE, 28000),
(3, 'Pádel 1', 'padel', 4, 'cemento', FALSE, 18000)
ON CONFLICT DO NOTHING;

INSERT INTO clientes (id_empresa, nombre, apellido, telefono, email) VALUES
(1, 'Lucas', 'Gómez', '351-5550001', 'lucas@mail.com'),
(1, 'Martina', 'Pérez', '351-5550002', NULL),
(2, 'Lucas', 'Gómez', '351-5550001', 'lucas@mail.com'),
(3, 'Sofía', 'Rodríguez', '351-5550003', 'sofia@mail.com')
ON CONFLICT DO NOTHING;
