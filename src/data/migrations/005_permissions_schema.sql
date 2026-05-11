-- 5. Crear tablas de permisos y permisos por usuario/rol
BEGIN;

CREATE TABLE IF NOT EXISTS "control financiero".permisos (
    id_permiso SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    categoria VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "control financiero".rol_permisos (
    id_rol INTEGER NOT NULL REFERENCES "control financiero".roles(id_rol) ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE IF NOT EXISTS "control financiero".usuario_permisos (
    id_usuario INTEGER NOT NULL REFERENCES "control financiero".usuarios(id_usuario) ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE,
    otorgado BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_usuario, id_permiso)
);

COMMIT;
