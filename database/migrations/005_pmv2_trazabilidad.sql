-- PMV2: eventos de trazabilidad y variables del beneficio.
-- Solo crea tablas, índices y restricciones nuevas.
-- No altera, no actualiza y no elimina tablas ni datos del PMV1.
-- Puede ejecutarse de nuevo: si las tablas ya existen, no las vuelve a crear.
-- El backend autoriza cada operación. RLS queda activo y sin políticas,
-- igual que en el PMV1: el rol anónimo de Supabase no lee ni escribe estas tablas.

CREATE TABLE IF NOT EXISTS eventos_trazabilidad (
  id UUID PRIMARY KEY,
  lote_id UUID NOT NULL,
  etapa VARCHAR(30) NOT NULL,
  fecha DATE NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_eventos_id_lote UNIQUE (id, lote_id),
  CONSTRAINT fk_eventos_lote FOREIGN KEY (lote_id) REFERENCES lotes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_eventos_etapa CHECK (
    etapa IN ('BENEFICIO', 'TRILLA', 'ALMACENAMIENTO', 'TRASLADO', 'EXPORTACION')
  ),
  CONSTRAINT ck_eventos_descripcion CHECK (char_length(descripcion) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_eventos_lote_fecha
  ON eventos_trazabilidad (lote_id, fecha, created_at);

CREATE TABLE IF NOT EXISTS variables_productivas (
  id UUID PRIMARY KEY,
  evento_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  metodo_beneficio VARCHAR(20) NOT NULL,
  humedad_porcentaje NUMERIC(5, 2) NOT NULL,
  CONSTRAINT uq_variables_evento UNIQUE (evento_id),
  CONSTRAINT fk_variables_evento_lote
    FOREIGN KEY (evento_id, lote_id) REFERENCES eventos_trazabilidad (id, lote_id) ON DELETE RESTRICT,
  CONSTRAINT fk_variables_lote FOREIGN KEY (lote_id) REFERENCES lotes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_variables_metodo CHECK (metodo_beneficio IN ('Lavado', 'Honey', 'Natural')),
  CONSTRAINT ck_variables_humedad CHECK (
    humedad_porcentaje >= 0 AND humedad_porcentaje <= 100
  )
);

CREATE INDEX IF NOT EXISTS idx_variables_lote ON variables_productivas (lote_id);

ALTER TABLE eventos_trazabilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE variables_productivas ENABLE ROW LEVEL SECURITY;
