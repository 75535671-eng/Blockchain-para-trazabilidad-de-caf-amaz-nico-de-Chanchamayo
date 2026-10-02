-- Asegura la unicidad de DNI/RUC si la tabla se creó antes de esa restricción.
-- No borra datos. Si el documento ya está duplicado, esta sentencia fallará y hay que corregir esos registros antes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_productores_documento'
      AND conrelid = 'productores'::regclass
  ) THEN
    ALTER TABLE productores
      ADD CONSTRAINT uq_productores_documento UNIQUE (documento_identidad);
  END IF;
END $$;
