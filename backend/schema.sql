-- Extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla Productor
CREATE TABLE IF NOT EXISTS productor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    dni_ruc VARCHAR(20) UNIQUE NOT NULL,
    comunidad VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Parcela
CREATE TABLE IF NOT EXISTS parcela (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_productor UUID NOT NULL REFERENCES productor(id) ON DELETE CASCADE,
    nombre_finca VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    altitud_msnm INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Lote
CREATE TABLE IF NOT EXISTS lote (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    id_parcela UUID NOT NULL REFERENCES parcela(id) ON DELETE CASCADE,
    variedad VARCHAR(50) NOT NULL,
    peso_kg NUMERIC(10,2) NOT NULL,
    altitud_msnm INT NOT NULL,
    fecha_cosecha DATE NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'COSECHADO',
    hash_verificacion VARCHAR(64) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Evento Trazabilidad
CREATE TABLE IF NOT EXISTS evento_trazabilidad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lote UUID NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    responsable VARCHAR(100) NOT NULL,
    hash_evento VARCHAR(64) NOT NULL,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);