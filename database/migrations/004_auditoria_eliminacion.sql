-- Historial mínimo de eliminaciones de productores.
-- Solo guarda la fecha, el administrador responsable y el identificador del productor.
-- No conserva nombre, documento, contraseña ni datos de parcelas o lotes.
-- No borra datos existentes.

CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
  id UUID PRIMARY KEY,
  administrador_id UUID NOT NULL,
  productor_id UUID NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_auditoria_administrador FOREIGN KEY (administrador_id) REFERENCES usuarios (id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_eliminaciones_fecha ON auditoria_eliminaciones (fecha);

ALTER TABLE auditoria_eliminaciones ENABLE ROW LEVEL SECURITY;
