-- Leer estos resultados en camara en el episodio de metricas.
SELECT COUNT(*) AS productores FROM productores WHERE documento_identidad LIKE 'VID%';
SELECT COUNT(*) AS parcelas FROM parcelas WHERE nombre LIKE 'Parcela video %';
SELECT COUNT(*) AS lotes FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%';
SELECT COUNT(*) AS eventos FROM eventos_trazabilidad e JOIN lotes l ON l.id = e.lote_id WHERE l.codigo LIKE 'CHNY-2026-VID%';
SELECT e.etapa, COUNT(*) AS cantidad FROM eventos_trazabilidad e JOIN lotes l ON l.id = e.lote_id WHERE l.codigo LIKE 'CHNY-2026-VID%' GROUP BY e.etapa ORDER BY e.etapa;
SELECT * FROM listar_eventos_lote(ARRAY[(SELECT id FROM lotes WHERE codigo = 'CHNY-2026-VID00001')]);
