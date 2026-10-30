-- PMV2: predicciones de calidad que produzca un modelo validado.
-- Solo crea una tabla nueva. No altera ni borra tablas del PMV1 ni de la migración 005.
-- No inserta resultados. La tabla permanece vacía mientras no exista un modelo integrado.
-- RLS activo y sin políticas, igual que el resto del esquema.

CREATE TABLE IF NOT EXISTS predicciones_calidad (
  id UUID PRIMARY KEY,
  lote_id UUID NOT NULL,
  calidad VARCHAR(80) NOT NULL,
  modelo VARCHAR(120) NOT NULL,
  referencia VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_predicciones_lote FOREIGN KEY (lote_id) REFERENCES lotes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_predicciones_calidad CHECK (char_length(calidad) >= 1),
  CONSTRAINT ck_predicciones_modelo CHECK (char_length(modelo) >= 1),
  CONSTRAINT ck_predicciones_referencia CHECK (char_length(referencia) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_predicciones_lote ON predicciones_calidad (lote_id, created_at);

ALTER TABLE predicciones_calidad ENABLE ROW LEVEL SECURITY;
