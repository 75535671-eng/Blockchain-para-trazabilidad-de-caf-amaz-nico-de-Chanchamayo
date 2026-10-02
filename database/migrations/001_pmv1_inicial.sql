-- PMV1: esquema inicial para Supabase/PostgreSQL.
-- Aplicar en el SQL Editor del proyecto o con psql sobre DATABASE_URL.
-- No elimina tablas ni datos. Puede ejecutarse de nuevo sobre un esquema vacío o ya creado con este script.
-- El backend se conecta con el rol de base de datos y autoriza cada operación.
-- RLS queda activo sin políticas: la API pública de Supabase no lee ni escribe estas tablas.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT ck_usuarios_rol CHECK (rol IN ('ADMINISTRADOR', 'PRODUCTOR'))
);

CREATE TABLE IF NOT EXISTS productores (
  id UUID PRIMARY KEY,
  usuario_id UUID NULL,
  nombre VARCHAR(150) NOT NULL,
  documento_identidad VARCHAR(15) NOT NULL,
  telefono VARCHAR(20) NULL,
  organizacion VARCHAR(150) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_productores_documento UNIQUE (documento_identidad),
  CONSTRAINT uq_productores_usuario UNIQUE (usuario_id),
  CONSTRAINT fk_productores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE IF NOT EXISTS parcelas (
  id UUID PRIMARY KEY,
  productor_id UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  distrito VARCHAR(80) NOT NULL,
  localidad VARCHAR(120) NULL,
  area_hectareas NUMERIC(10, 2) NOT NULL,
  altitud_msnm INTEGER NULL,
  latitud NUMERIC(9, 6) NULL,
  longitud NUMERIC(9, 6) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parcelas_productor_nombre UNIQUE (productor_id, nombre),
  CONSTRAINT fk_parcelas_productor FOREIGN KEY (productor_id) REFERENCES productores (id)
);

CREATE INDEX IF NOT EXISTS idx_parcelas_productor ON parcelas (productor_id);

CREATE TABLE IF NOT EXISTS lotes (
  id UUID PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  parcela_id UUID NOT NULL,
  fecha_cosecha DATE NOT NULL,
  cantidad_kg NUMERIC(10, 2) NOT NULL,
  variedad VARCHAR(80) NOT NULL,
  observaciones VARCHAR(500) NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'REGISTRADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lotes_codigo UNIQUE (codigo),
  CONSTRAINT fk_lotes_parcela FOREIGN KEY (parcela_id) REFERENCES parcelas (id)
);

CREATE INDEX IF NOT EXISTS idx_lotes_parcela ON lotes (parcela_id);

CREATE TABLE IF NOT EXISTS analisis_lotes (
  id UUID PRIMARY KEY,
  lote_id UUID NOT NULL,
  estrategia VARCHAR(40) NOT NULL,
  clasificacion VARCHAR(20) NOT NULL,
  resumen VARCHAR(1000) NOT NULL,
  observaciones JSONB NOT NULL,
  confianza VARCHAR(10) NOT NULL,
  proveedor VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_analisis_lote FOREIGN KEY (lote_id) REFERENCES lotes (id),
  CONSTRAINT ck_analisis_estrategia CHECK (estrategia IN ('CON_ALTITUD', 'SIN_ALTITUD')),
  CONSTRAINT ck_analisis_clasificacion CHECK (clasificacion IN ('COHERENTE', 'REVISAR', 'INSUFICIENTE')),
  CONSTRAINT ck_analisis_confianza CHECK (confianza IN ('BAJA', 'MEDIA', 'ALTA'))
);

CREATE INDEX IF NOT EXISTS idx_analisis_lote ON analisis_lotes (lote_id, created_at);

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_productores_updated_at ON productores;
CREATE TRIGGER trg_productores_updated_at
  BEFORE UPDATE ON productores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_parcelas_updated_at ON parcelas;
CREATE TRIGGER trg_parcelas_updated_at
  BEFORE UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lotes_updated_at ON lotes;
CREATE TRIGGER trg_lotes_updated_at
  BEFORE UPDATE ON lotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productores ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_lotes ENABLE ROW LEVEL SECURITY;
