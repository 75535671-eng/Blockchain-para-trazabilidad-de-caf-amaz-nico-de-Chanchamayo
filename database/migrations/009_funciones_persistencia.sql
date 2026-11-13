-- Las consultas de los adaptadores viven aquí.
-- El backend solo invoca el nombre de cada función.
-- Puede ejecutarse de nuevo. No borra filas ni cambia tablas.

DROP FUNCTION IF EXISTS listar_eventos_lote(uuid[]);

CREATE OR REPLACE FUNCTION listar_eventos_lote(lote_ids text[])
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
SET search_path = public
AS $$
  SELECT eventos.id,
         eventos.lote_id,
         eventos.etapa,
         eventos.fecha,
         eventos.descripcion,
         eventos.created_at,
         variables.id,
         variables.metodo_beneficio,
         variables.humedad_porcentaje
  FROM eventos_trazabilidad eventos
  LEFT JOIN variables_productivas variables ON variables.evento_id = eventos.id
  WHERE eventos.lote_id = ANY(lote_ids::uuid[])
  ORDER BY eventos.fecha ASC, eventos.created_at ASC, eventos.id ASC;
$$;

CREATE OR REPLACE FUNCTION buscar_usuario_por_email(p_email varchar)
RETURNS SETOF usuarios LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM usuarios WHERE email = p_email;
$$;

CREATE OR REPLACE FUNCTION buscar_usuario_por_id(p_id uuid)
RETURNS SETOF usuarios LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM usuarios WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION actualizar_rol_usuario(p_id uuid, p_rol varchar)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE usuarios SET rol = p_rol WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION actualizar_password_usuario(p_id uuid, p_password_hash varchar)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE usuarios SET password_hash = p_password_hash, debe_cambiar_password = FALSE WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION insertar_usuario(
  p_id uuid, p_nombre varchar, p_email varchar, p_password_hash varchar,
  p_rol varchar, p_estado varchar, p_debe_cambiar boolean, p_created_at timestamptz
) RETURNS SETOF usuarios LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO usuarios (id, nombre, email, password_hash, rol, estado, debe_cambiar_password, created_at)
  VALUES (p_id, p_nombre, p_email, p_password_hash, p_rol, p_estado, p_debe_cambiar, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION insertar_productor(
  p_id uuid, p_usuario_id uuid, p_nombre varchar, p_documento varchar,
  p_telefono varchar, p_organizacion varchar, p_created_at timestamptz
) RETURNS SETOF productores LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion, created_at)
  VALUES (p_id, p_usuario_id, p_nombre, p_documento, p_telefono, p_organizacion, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION insertar_solicitud(
  p_id uuid, p_nombre varchar, p_documento varchar, p_telefono varchar, p_organizacion varchar,
  p_email varchar, p_password_hash varchar, p_estado varchar, p_fecha timestamptz
) RETURNS SETOF solicitudes_registro LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO solicitudes_registro
    (id, nombre, documento_identidad, telefono, organizacion, email, password_hash, estado, fecha_solicitud)
  VALUES (p_id, p_nombre, p_documento, p_telefono, p_organizacion, p_email, p_password_hash, p_estado, p_fecha)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION buscar_solicitud_por_id(p_id uuid)
RETURNS SETOF solicitudes_registro LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM solicitudes_registro WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION buscar_solicitud_reciente_por_email(p_email varchar)
RETURNS SETOF solicitudes_registro LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM solicitudes_registro WHERE email = p_email ORDER BY fecha_solicitud DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION buscar_solicitud_activa_por_email(p_email varchar)
RETURNS SETOF solicitudes_registro LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM solicitudes_registro
  WHERE email = p_email AND estado IN ('pendiente', 'aprobada')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION buscar_solicitud_activa_por_documento(p_documento varchar)
RETURNS SETOF solicitudes_registro LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM solicitudes_registro
  WHERE documento_identidad = p_documento AND estado IN ('pendiente', 'aprobada')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION listar_solicitudes()
RETURNS SETOF solicitudes_registro LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM solicitudes_registro ORDER BY fecha_solicitud DESC;
$$;

CREATE OR REPLACE FUNCTION bloquear_solicitud(p_id uuid)
RETURNS TABLE (estado varchar) LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT solicitudes_registro.estado FROM solicitudes_registro WHERE id = p_id FOR UPDATE;
$$;

CREATE OR REPLACE FUNCTION marcar_solicitud_aprobada(
  p_id uuid, p_administrador_id uuid, p_usuario_id uuid, p_productor_id uuid
) RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE solicitudes_registro
  SET estado = 'aprobada', fecha_resolucion = NOW(), administrador_id = p_administrador_id,
      usuario_id = p_usuario_id, productor_id = p_productor_id
  WHERE id = p_id AND estado = 'pendiente';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION rechazar_solicitud(p_id uuid, p_motivo varchar, p_administrador_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE solicitudes_registro
  SET estado = 'rechazada', motivo_rechazo = p_motivo, fecha_resolucion = NOW(), administrador_id = p_administrador_id
  WHERE id = p_id AND estado = 'pendiente';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION actualizar_productor(p_nombre varchar, p_telefono varchar, p_organizacion varchar, p_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE productores SET nombre = p_nombre, telefono = p_telefono, organizacion = p_organizacion WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION bloquear_productor(p_id uuid)
RETURNS TABLE (id uuid, usuario_id uuid, documento_identidad varchar)
LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT productores.id, productores.usuario_id, productores.documento_identidad
  FROM productores WHERE productores.id = p_id FOR UPDATE;
$$;

CREATE OR REPLACE FUNCTION soltar_administrador_solicitudes(p_usuario_id uuid, p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE solicitudes_registro SET administrador_id = NULL
  WHERE administrador_id = p_usuario_id AND productor_id IS DISTINCT FROM p_productor_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_solicitudes_productor(p_productor_id uuid, p_usuario_id uuid, p_documento varchar)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM solicitudes_registro
  WHERE productor_id = p_productor_id
     OR (p_usuario_id IS NOT NULL AND usuario_id = p_usuario_id)
     OR documento_identidad = p_documento;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_trazabilidad_productor(p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer := 0; parcial integer;
BEGIN
  DELETE FROM predicciones_calidad WHERE lote_id IN (
    SELECT lotes.id FROM lotes JOIN parcelas ON parcelas.id = lotes.parcela_id WHERE parcelas.productor_id = p_productor_id
  );
  GET DIAGNOSTICS parcial = ROW_COUNT; n := n + parcial;
  DELETE FROM variables_productivas WHERE lote_id IN (
    SELECT lotes.id FROM lotes JOIN parcelas ON parcelas.id = lotes.parcela_id WHERE parcelas.productor_id = p_productor_id
  );
  GET DIAGNOSTICS parcial = ROW_COUNT; n := n + parcial;
  DELETE FROM eventos_trazabilidad WHERE lote_id IN (
    SELECT lotes.id FROM lotes JOIN parcelas ON parcelas.id = lotes.parcela_id WHERE parcelas.productor_id = p_productor_id
  );
  GET DIAGNOSTICS parcial = ROW_COUNT; n := n + parcial;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_analisis_productor(p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM analisis_lotes
  WHERE lote_id IN (
    SELECT lotes.id FROM lotes
    JOIN parcelas ON parcelas.id = lotes.parcela_id
    WHERE parcelas.productor_id = p_productor_id
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_lotes_productor(p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM lotes WHERE parcela_id IN (SELECT id FROM parcelas WHERE productor_id = p_productor_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_parcelas_productor(p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM parcelas WHERE productor_id = p_productor_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_productor(p_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM productores WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_usuario_ajeno(p_usuario_id uuid, p_administrador_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM usuarios WHERE id = p_usuario_id AND id <> p_administrador_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION registrar_auditoria_eliminacion(p_id uuid, p_administrador_id uuid, p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
BEGIN
  INSERT INTO auditoria_eliminaciones (id, administrador_id, productor_id)
  VALUES (p_id, p_administrador_id, p_productor_id);
  RETURN QUERY SELECT 1;
END;
$$;

CREATE OR REPLACE FUNCTION buscar_productor_por_id(p_id uuid)
RETURNS SETOF productores LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM productores WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION buscar_productor_por_usuario(p_usuario_id uuid)
RETURNS SETOF productores LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM productores WHERE usuario_id = p_usuario_id;
$$;

CREATE OR REPLACE FUNCTION buscar_productor_por_documento(p_documento varchar)
RETURNS SETOF productores LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM productores WHERE documento_identidad = p_documento;
$$;

CREATE OR REPLACE FUNCTION listar_productores()
RETURNS SETOF productores LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM productores ORDER BY nombre;
$$;

CREATE OR REPLACE FUNCTION asignar_cuenta_productor(p_usuario_id uuid, p_productor_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE productores SET usuario_id = p_usuario_id WHERE id = p_productor_id AND usuario_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION insertar_parcela(
  p_id uuid, p_productor_id uuid, p_nombre varchar, p_distrito varchar, p_localidad varchar,
  p_area numeric, p_altitud integer, p_latitud numeric, p_longitud numeric, p_created_at timestamptz
) RETURNS SETOF parcelas LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO parcelas
    (id, productor_id, nombre, distrito, localidad, area_hectareas, altitud_msnm, latitud, longitud, created_at)
  VALUES (p_id, p_productor_id, p_nombre, p_distrito, p_localidad, p_area, p_altitud, p_latitud, p_longitud, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION actualizar_parcela(
  p_productor_id uuid, p_nombre varchar, p_distrito varchar, p_localidad varchar,
  p_area numeric, p_altitud integer, p_latitud numeric, p_longitud numeric, p_id uuid
) RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE parcelas
  SET productor_id = p_productor_id, nombre = p_nombre, distrito = p_distrito, localidad = p_localidad,
      area_hectareas = p_area, altitud_msnm = p_altitud, latitud = p_latitud, longitud = p_longitud
  WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION borrar_parcela(p_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM parcelas WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION buscar_parcela_por_id(p_id uuid)
RETURNS SETOF parcelas LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM parcelas WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION buscar_parcela_por_productor_nombre(p_productor_id uuid, p_nombre varchar)
RETURNS SETOF parcelas LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM parcelas WHERE productor_id = p_productor_id AND nombre = p_nombre LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION listar_parcelas()
RETURNS SETOF parcelas LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM parcelas ORDER BY nombre;
$$;

CREATE OR REPLACE FUNCTION listar_parcelas_productor(p_productor_id uuid)
RETURNS SETOF parcelas LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM parcelas WHERE productor_id = p_productor_id ORDER BY nombre;
$$;

CREATE OR REPLACE FUNCTION insertar_lote(
  p_id uuid, p_codigo varchar, p_parcela_id uuid, p_fecha date, p_cantidad numeric,
  p_variedad varchar, p_observaciones varchar, p_estado varchar, p_created_at timestamptz
) RETURNS SETOF lotes LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO lotes (id, codigo, parcela_id, fecha_cosecha, cantidad_kg, variedad, observaciones, estado, created_at)
  VALUES (p_id, p_codigo, p_parcela_id, p_fecha, p_cantidad, p_variedad, p_observaciones, p_estado, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION actualizar_lote(
  p_parcela_id uuid, p_fecha date, p_cantidad numeric, p_variedad varchar, p_observaciones varchar, p_id uuid
) RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE lotes
  SET parcela_id = p_parcela_id, fecha_cosecha = p_fecha, cantidad_kg = p_cantidad,
      variedad = p_variedad, observaciones = p_observaciones
  WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION eliminar_lote(p_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM predicciones_calidad WHERE lote_id = p_id;
  DELETE FROM variables_productivas WHERE lote_id = p_id;
  DELETE FROM eventos_trazabilidad WHERE lote_id = p_id;
  DELETE FROM analisis_lotes WHERE lote_id = p_id;
  DELETE FROM lotes WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION buscar_lote_por_id(p_id uuid)
RETURNS SETOF lotes LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM lotes WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION buscar_lote_por_codigo(p_codigo varchar)
RETURNS SETOF lotes LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM lotes WHERE codigo = p_codigo;
$$;

CREATE OR REPLACE FUNCTION listar_lotes()
RETURNS SETOF lotes LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM lotes ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION listar_lotes_por_parcelas(p_ids text[])
RETURNS SETOF lotes LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM lotes WHERE parcela_id = ANY(p_ids::uuid[]) ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION insertar_analisis(
  p_id uuid, p_lote_id uuid, p_estrategia varchar, p_clasificacion varchar, p_resumen varchar,
  p_observaciones text, p_confianza varchar, p_proveedor varchar, p_created_at timestamptz
) RETURNS SETOF analisis_lotes LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO analisis_lotes
    (id, lote_id, estrategia, clasificacion, resumen, observaciones, confianza, proveedor, created_at)
  VALUES (p_id, p_lote_id, p_estrategia, p_clasificacion, p_resumen, p_observaciones::jsonb, p_confianza, p_proveedor, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION borrar_analisis_lote(p_lote_id uuid)
RETURNS TABLE (filas integer) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM analisis_lotes WHERE lote_id = p_lote_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

CREATE OR REPLACE FUNCTION ultimo_analisis_lote(p_lote_id uuid)
RETURNS SETOF analisis_lotes LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM analisis_lotes WHERE lote_id = p_lote_id ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION registrar_evento(
  p_id uuid, p_lote_id uuid, p_etapa varchar, p_fecha date, p_descripcion varchar, p_created_at timestamptz,
  p_variable_id uuid, p_metodo varchar, p_humedad numeric
) RETURNS TABLE (id uuid) LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
BEGIN
  INSERT INTO eventos_trazabilidad (id, lote_id, etapa, fecha, descripcion, created_at)
  VALUES (p_id, p_lote_id, p_etapa, p_fecha, p_descripcion, p_created_at);
  IF p_variable_id IS NOT NULL THEN
    INSERT INTO variables_productivas (id, evento_id, lote_id, metodo_beneficio, humedad_porcentaje)
    VALUES (p_variable_id, p_id, p_lote_id, p_metodo, p_humedad);
  END IF;
  RETURN QUERY SELECT p_id;
END;
$$;

CREATE OR REPLACE FUNCTION lote_de_evento(p_id uuid)
RETURNS TABLE (lote_id uuid) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT eventos_trazabilidad.lote_id FROM eventos_trazabilidad WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION insertar_prediccion(
  p_id uuid, p_lote_id uuid, p_calidad varchar, p_modelo varchar, p_referencia varchar, p_created_at timestamptz
) RETURNS SETOF predicciones_calidad LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO predicciones_calidad (id, lote_id, calidad, modelo, referencia, created_at)
  VALUES (p_id, p_lote_id, p_calidad, p_modelo, p_referencia, p_created_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION listar_predicciones_lotes(p_ids text[])
RETURNS SETOF predicciones_calidad LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM predicciones_calidad
  WHERE lote_id = ANY(p_ids::uuid[])
  ORDER BY created_at ASC, id ASC;
$$;

CREATE OR REPLACE FUNCTION insertar_referencia_anclaje(
  p_id uuid, p_evento_id uuid, p_hash varchar, p_red varchar, p_identificador varchar, p_fecha timestamptz
) RETURNS SETOF referencias_anclaje LANGUAGE sql VOLATILE SET search_path = public AS $$
  INSERT INTO referencias_anclaje (id, evento_id, hash_evento, red, identificador_transaccion, fecha)
  VALUES (p_id, p_evento_id, p_hash, p_red, p_identificador, p_fecha)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION buscar_referencia_por_evento(p_evento_id uuid)
RETURNS TABLE (
  id uuid, evento_id uuid, hash_evento varchar, red varchar, identificador_transaccion varchar, fecha timestamptz
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id, evento_id, hash_evento, red, identificador_transaccion, fecha
  FROM referencias_anclaje WHERE evento_id = p_evento_id;
$$;

CREATE OR REPLACE FUNCTION listar_referencias_eventos(p_ids text[])
RETURNS TABLE (
  id uuid, evento_id uuid, hash_evento varchar, red varchar, identificador_transaccion varchar, fecha timestamptz
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id, evento_id, hash_evento, red, identificador_transaccion, fecha
  FROM referencias_anclaje WHERE evento_id = ANY(p_ids::uuid[]);
$$;

CREATE OR REPLACE FUNCTION ultimo_eslabon()
RETURNS TABLE (identificador_transaccion varchar) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT identificador_transaccion FROM referencias_anclaje ORDER BY secuencia DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION listar_eslabones()
RETURNS TABLE (hash_evento varchar, identificador_transaccion varchar)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT hash_evento, identificador_transaccion FROM referencias_anclaje ORDER BY secuencia ASC;
$$;
