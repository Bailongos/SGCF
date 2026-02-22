-- Schema: "control financiero"

BEGIN;

-- 1. Ensure 'usuarios' table has necessary columns and constraints
ALTER TABLE "control financiero".usuarios
DROP COLUMN IF EXISTS matricula_alumno;

-- Ensure username is unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_unique') THEN
        ALTER TABLE "control financiero".usuarios ADD CONSTRAINT usuarios_username_unique UNIQUE (username);
    END IF;
END $$;

-- Add new columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'control financiero' AND table_name = 'usuarios' AND column_name = 'email') THEN
        ALTER TABLE "control financiero".usuarios ADD COLUMN email VARCHAR(255);
        ALTER TABLE "control financiero".usuarios ADD CONSTRAINT usuarios_email_unique UNIQUE (email);
    END IF;
END $$;

-- Ensure 'activo' is boolean and default TRUE for now
ALTER TABLE "control financiero".usuarios ALTER COLUMN activo SET DEFAULT TRUE;

-- 2. Create 'usuarios_identidades' table
CREATE TABLE IF NOT EXISTS "control financiero".usuarios_identidades (
    id_identidad SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES "control financiero".usuarios(id_usuario) ON DELETE CASCADE,
    proveedor VARCHAR(50) NOT NULL CHECK (proveedor IN ('GOOGLE', 'MICROSOFT')),
    proveedor_sub VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    email_verificado BOOLEAN DEFAULT FALSE,
    nombre VARCHAR(255),
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (proveedor, proveedor_sub)
);

-- 3. Ensure bitacora_auditoria table exists
CREATE TABLE IF NOT EXISTS "control financiero".bitacora_auditoria (
    id_log SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES "control financiero".usuarios(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ensure Roles exist (Administrador, Coordinador, Caja, Pendiente)
-- Assuming 'roles' table has a unique constraint on 'nombre_rol'. 
-- If not, duplicates might be created, but usually roles tables have unique names.
INSERT INTO "control financiero".roles (nombre_rol)
VALUES ('Administrador'), ('Coordinador'), ('Caja'), ('Pendiente')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 4. Ensure password column is long enough for hashes
ALTER TABLE "control financiero".usuarios ALTER COLUMN password TYPE VARCHAR(255);

COMMIT;
