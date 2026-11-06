-- PMV2: el historial de un lote se consulta con una función almacenada.
-- Puede ejecutarse de nuevo. No borra eventos ni variables.

CREATE OR REPLACE FUNCTION listar_eventos_lote(lote_ids uuid[])
RETURNS TABLE (
  id uuid,
  lote_id uuid,
  etapa varchar,
  fecha date,
  descripcion varchar,
  created_at timestamptz,
  variable_id uuid,
  metodo_beneficio varchar,
  humedad_porcentaje numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT eventos.id,
         eventos.lote_id,
         eventos.etapa,
         eventos.fecha,
         eventos.descripcion,
         eventos.created_at,
         variables.id AS variable_id,
         variables.metodo_beneficio,
         variables.humedad_porcentaje
  FROM eventos_trazabilidad eventos
  LEFT JOIN variables_productivas variables ON variables.evento_id = eventos.id
  WHERE eventos.lote_id = ANY(lote_ids)
  ORDER BY eventos.fecha ASC, eventos.created_at ASC, eventos.id ASC;
$$;
