-- Canchas, clientes y turnos (reservas).
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

-- Jugadores que se registran en la plataforma: ven todos los complejos y
-- sacan turnos en cualquiera de ellos.
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    fecha_alta TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_cancha INT NOT NULL,
    -- Turno sacado por un cliente registrado...
    id_cliente INT REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    -- ...o cargado a mano por el complejo (cliente por teléfono / mostrador)
    contacto_nombre VARCHAR(100),
    contacto_telefono VARCHAR(30),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,                -- puede ser 24:00 (medianoche)
    estado VARCHAR(20) NOT NULL DEFAULT 'reservada'
        CHECK (estado IN ('reservada', 'confirmada', 'cancelada', 'jugada')),
    precio_total NUMERIC(10, 2) NOT NULL CHECK (precio_total >= 0),
    -- Las señas y los saldos cobrados están en la tabla pagos (gestion.sql)
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    CHECK (hora_fin > hora_inicio),
    -- FK compuesta: la cancha tiene que ser de la MISMA empresa del turno
    FOREIGN KEY (id_cancha, id_empresa) REFERENCES canchas(id_cancha, id_empresa) ON DELETE CASCADE,
    -- Una cancha no puede tener dos reservas que se superpongan en el mismo día.
    -- La valida la base de datos, así que vale aunque dos réplicas de la API
    -- intenten reservar el mismo horario al mismo tiempo.
    EXCLUDE USING gist (
        id_cancha WITH =,
        tsrange(fecha + hora_inicio, fecha + hora_fin) WITH &&
    ) WHERE (estado <> 'cancelada')
);

CREATE INDEX IF NOT EXISTS idx_reservas_empresa_fecha ON reservas (id_empresa, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON reservas (id_cliente);

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

-- Clientes de demo (contraseña demo1234)
INSERT INTO clientes (nombre, apellido, telefono, email, password_hash) VALUES
('Lucas', 'Gómez', '351-5550001', 'lucas@mail.com', '$2b$10$qjJoUHwz8Yy/BVUjLxY.bOjnfAmUdxASdtRwXhpM2zxMDm/vKTeqy'),
('Sofía', 'Rodríguez', '351-5550003', 'sofia@mail.com', '$2b$10$qjJoUHwz8Yy/BVUjLxY.bOjnfAmUdxASdtRwXhpM2zxMDm/vKTeqy')
ON CONFLICT (email) DO NOTHING;

INSERT INTO reservas (id_empresa, id_cancha, id_cliente, contacto_nombre, contacto_telefono, fecha, hora_inicio, hora_fin, precio_total) VALUES
(1, 1, 1, NULL, NULL, CURRENT_DATE + 1, '20:00', '21:00', 30000),
(1, 2, NULL, 'Martina Pérez', '351-5550002', CURRENT_DATE + 1, '21:00', '22:00', 35000),
(2, 4, 2, NULL, NULL, CURRENT_DATE + 2, '18:00', '19:30', 30000);
