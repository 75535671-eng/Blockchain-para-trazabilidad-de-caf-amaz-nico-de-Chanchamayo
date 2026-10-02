-- Cuentas de productor y solicitudes de registro.
-- No borra datos. Las cuentas ya existentes quedan activas y sin cambio obligatorio de contraseña.
-- El backend autoriza cada operación. RLS queda activo sin políticas para la API pública de Supabase.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_usuarios_estado' AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT ck_usuarios_estado CHECK (estado IN ('activa', 'bloqueada'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS solicitudes_registro (
  id UUID PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  documento_identidad VARCHAR(15) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  organizacion VARCHAR(150) NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_rechazo VARCHAR(500) NULL,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ NULL,
  administrador_id UUID NULL,
  usuario_id UUID NULL,
  productor_id UUID NULL,
  CONSTRAINT ck_solicitudes_estado CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  CONSTRAINT fk_solicitudes_admin FOREIGN KEY (administrador_id) REFERENCES usuarios (id),
  CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_solicitudes_productor FOREIGN KEY (productor_id) REFERENCES productores (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitudes_email_activa
  ON solicitudes_registro (email)
  WHERE estado IN ('pendiente', 'aprobada');

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitudes_documento_activa
  ON solicitudes_registro (documento_identidad)
  WHERE estado IN ('pendiente', 'aprobada');

ALTER TABLE solicitudes_registro ENABLE ROW LEVEL SECURITY;
