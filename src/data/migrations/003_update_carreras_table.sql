-- Schema: "control financiero"

BEGIN;

-- 1. Add 'clave' column
ALTER TABLE "control financiero".carreras ADD COLUMN IF NOT EXISTS clave VARCHAR(20);

-- 2. Fill temporary 'clave' for existing records based on ID or Name
UPDATE "control financiero".carreras 
SET clave = 'CAR' || id_carrera 
WHERE clave IS NULL;

-- 3. Make 'clave' NOT NULL and UNIQUE
ALTER TABLE "control financiero".carreras ALTER COLUMN clave SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carreras_clave_unique') THEN
        ALTER TABLE "control financiero".carreras ADD CONSTRAINT carreras_clave_unique UNIQUE (clave);
    END IF;
END $$;

-- 4. Remove UNIQUE constraint from 'nombre'
-- We need to find the constraint name first. Usually it's 'carreras_nombre_key' or similar.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = '"control financiero".carreras'::regclass
      AND contype = 'u'
      AND ARRAY['nombre'::name] <@ (
        SELECT array_agg(attname)
        FROM pg_attribute
        WHERE attrelid = conrelid AND attnum = ANY(conkey)
      );

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "control financiero".carreras DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 5. Add alphanumeric CHECK to 'clave' (allow letters, numbers, and optionally - or _)
ALTER TABLE "control financiero".carreras ADD CONSTRAINT carreras_clave_check 
CHECK (clave ~ '^[a-zA-Z0-9_-]+$');

COMMIT;
