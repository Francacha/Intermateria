-- Usuarios del sistema y datos de cada complejo. Todo vive en PostgreSQL.
--   administradores: gestionan las empresas (alta, baja, edición)
--   empresas:        cada complejo deportivo (multitenant)
--   perfiles:        descripción, servicios, horarios y redes de cada complejo

CREATE TABLE IF NOT EXISTS administradores (
    id_admin SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS empresas (
    id_empresa SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    cuit VARCHAR(13) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,            -- usuario para iniciar sesión
    password_hash VARCHAR(100),           -- contraseña cifrada con bcrypt (nunca en texto plano)
    telefono VARCHAR(30),
    direccion VARCHAR(200),
    activo BOOLEAN DEFAULT TRUE,          -- el admin puede darla de baja sin borrarla
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Un perfil por complejo. Los horarios van en JSONB porque son 7 días con
-- abierto/abre/cierra: {"lunes": {"abierto": true, "abre": "09:00", "cierra": "23:00"}, ...}
CREATE TABLE IF NOT EXISTS perfiles (
    id_empresa INT PRIMARY KEY REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    descripcion VARCHAR(500) NOT NULL DEFAULT '',
    servicios TEXT[] NOT NULL DEFAULT '{}',
    horarios JSONB NOT NULL,
    instagram VARCHAR(60) NOT NULL DEFAULT '',
    whatsapp VARCHAR(30) NOT NULL DEFAULT '',
    actualizado TIMESTAMP DEFAULT NOW()
);

-- Datos de prueba
INSERT INTO empresas (nombre, cuit, email, telefono, direccion) VALUES
('Eventos del Centro', '30-71234567-8', 'contacto@eventosdelcentro.com', '351-4001122', 'Av. Colón 1200, Córdoba'),
('Fiestas Norte', '30-70987654-3', 'info@fiestasnorte.com', '351-4553344', 'Rafael Núñez 4500, Córdoba'),
('Producciones Sur', '30-69876543-1', 'hola@produccionessur.com', NULL, NULL)
ON CONFLICT (cuit) DO NOTHING;

-- Contraseña de demo para las empresas de prueba: demo1234 (hash bcrypt)
UPDATE empresas SET password_hash = '$2b$10$qjJoUHwz8Yy/BVUjLxY.bOjnfAmUdxASdtRwXhpM2zxMDm/vKTeqy'
WHERE cuit IN ('30-71234567-8', '30-70987654-3', '30-69876543-1') AND password_hash IS NULL;

INSERT INTO perfiles (id_empresa, descripcion, servicios, horarios, instagram, whatsapp) VALUES
(1, 'Canchas de fútbol 5 y 7 de césped sintético en pleno centro.',
    '{Vestuarios,Duchas,Buffet,"Iluminación LED"}',
    '{"lunes":{"abierto":true,"abre":"10:00","cierra":"23:00"},"martes":{"abierto":true,"abre":"10:00","cierra":"23:00"},"miercoles":{"abierto":true,"abre":"10:00","cierra":"23:00"},"jueves":{"abierto":true,"abre":"10:00","cierra":"23:00"},"viernes":{"abierto":true,"abre":"10:00","cierra":"23:00"},"sabado":{"abierto":true,"abre":"09:00","cierra":"23:00"},"domingo":{"abierto":true,"abre":"09:00","cierra":"20:00"}}',
    '@eventosdelcentro', '351-4001122'),
(2, 'Pádel techado con blindex. Alquiler de paletas.',
    '{Vestuarios,Estacionamiento,"Alquiler de paletas"}',
    '{"lunes":{"abierto":true,"abre":"08:00","cierra":"23:00"},"martes":{"abierto":true,"abre":"08:00","cierra":"23:00"},"miercoles":{"abierto":true,"abre":"08:00","cierra":"23:00"},"jueves":{"abierto":true,"abre":"08:00","cierra":"23:00"},"viernes":{"abierto":true,"abre":"08:00","cierra":"23:00"},"sabado":{"abierto":true,"abre":"09:00","cierra":"22:00"},"domingo":{"abierto":false,"abre":"09:00","cierra":"22:00"}}',
    '@fiestasnorte', '')
ON CONFLICT DO NOTHING;

-- Administrador de demo: admin@canchas.com / admin1234
INSERT INTO administradores (nombre, email, password_hash) VALUES
('Administrador', 'admin@canchas.com', '$2b$10$adbhM8bzD65szCvgMP8idOaBmO/XvksL3YJ/FAegU4B2CpT1Nw/V6')
ON CONFLICT (email) DO NOTHING;
