-- Schema: "control financiero"

BEGIN;

-- 1. Create 'tipos_observacion' catalog table
CREATE TABLE IF NOT EXISTS "control financiero".tipos_observacion (
    clave VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default types if they don't exist
INSERT INTO "control financiero".tipos_observacion (clave, nombre)
VALUES ('GENERAL',   'Observación General'),
       ('ACADEMICA', 'Situación Académica'),
       ('CONDUCTA',  'Conducta / Disciplina'),
       ('FINANCIERA', 'Temas de Pago / Deuda')
ON CONFLICT (clave) DO NOTHING;

-- 2. Add 'tipo_clave' to 'observaciones' table
-- Check if it exists first (idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'control financiero' AND table_name = 'observaciones' AND column_name = 'tipo_clave') THEN
        ALTER TABLE "control financiero".observaciones ADD COLUMN tipo_clave VARCHAR(30);
    END IF;
END $$;

-- 3. Populate existing observations with 'GENERAL' type
UPDATE "control financiero".observaciones 
SET tipo_clave = 'GENERAL' 
WHERE tipo_clave IS NULL;

-- 4. Make it NOT NULL and add Foreign Key
ALTER TABLE "control financiero".observaciones ALTER COLUMN tipo_clave SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_observaciones_tipo') THEN
        ALTER TABLE "control financiero".observaciones 
        ADD CONSTRAINT fk_observaciones_tipo 
        FOREIGN KEY (tipo_clave) 
        REFERENCES "control financiero".tipos_observacion(clave)
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Add index for filtering
CREATE INDEX IF NOT EXISTS idx_observaciones_tipo ON "control financiero".observaciones (tipo_clave);

COMMIT;
