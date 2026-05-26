-- ==============================================================================
-- ESQUEMA DE BASE DE DATOS EXTRAÍDO AUTOMÁTICAMENTE DE SUPABASE
-- Fecha: 2026-05-22T03:58:03.149Z
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS "control financiero";
CREATE SCHEMA IF NOT EXISTS "public";

-- ==============================================================================
-- FUNCIONES
-- ==============================================================================

-- Función: control financiero.validar_scope_usuario
CREATE OR REPLACE FUNCTION "control financiero".validar_scope_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rol TEXT;
BEGIN
    -- Referencia explícita al esquema para evitar error 42P01
    SELECT nombre_rol INTO v_rol 
    FROM "control financiero".roles 
    WHERE id_rol = NEW.id_rol;

    IF v_rol IS NULL THEN
        RAISE EXCEPTION 'Rol inválido (id_rol=%)', NEW.id_rol;
    END IF;

    IF v_rol = 'Administrador' AND NEW.id_carrera IS NOT NULL THEN   
        RAISE EXCEPTION 'Administrador debe tener id_carrera NULL (acceso global)';
    END IF;

    IF v_rol = 'Coordinador' AND NEW.id_carrera IS NULL THEN
        RAISE EXCEPTION 'Coordinador debe estar asociado a una carrera';
    END IF;

    RETURN NEW;
END;
$function$
;

-- ==============================================================================
-- TABLAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "control financiero"."alumnos" (
    "matricula" VARCHAR(20) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "email_institucional" VARCHAR(100),
    "telefono_contacto" VARCHAR(20),
    "id_carrera" INTEGER NOT NULL,
    "semestre_actual" INTEGER DEFAULT 1,
    "activo" BOOLEAN DEFAULT true,
    "fecha_registro" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "control financiero"."bitacora_auditoria" (
    "id_log" INTEGER NOT NULL DEFAULT nextval('"control financiero".bitacora_auditoria_id_log_seq'::regclass),
    "id_usuario" INTEGER,
    "accion" VARCHAR(100) NOT NULL,
    "detalle" TEXT,
    "fecha" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "control financiero"."carreras" (
    "id_carrera" INTEGER NOT NULL DEFAULT nextval('"control financiero".carreras_id_carrera_seq'::regclass),
    "nombre" VARCHAR(100) NOT NULL,
    "duracion_semestres" INTEGER NOT NULL,
    "clave" VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS "control financiero"."ciclos_escolares" (
    "id_ciclo" INTEGER NOT NULL DEFAULT nextval('"control financiero".ciclos_escolares_id_ciclo_seq'::regclass),
    "nombre" VARCHAR(50) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "es_actual" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS "control financiero"."conceptos" (
    "clave" VARCHAR(20) NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "monto_default" NUMERIC NOT NULL,
    "genera_cuenta_default" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS "control financiero"."cuentas_por_cobrar" (
    "id_cuenta" INTEGER NOT NULL DEFAULT nextval('"control financiero".cuentas_por_cobrar_id_cuenta_seq'::regclass),
    "matricula" VARCHAR(20) NOT NULL,
    "concepto" VARCHAR(20) NOT NULL,
    "id_ciclo" INTEGER NOT NULL,
    "monto" NUMERIC NOT NULL,
    "pagado" BOOLEAN DEFAULT false,
    "fecha_pago" DATE,
    "fecha_creacion" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "id_metodo" INTEGER
);

CREATE TABLE IF NOT EXISTS "control financiero"."metodos_pago" (
    "id_metodo" INTEGER NOT NULL DEFAULT nextval('"control financiero".metodos_pago_id_metodo_seq'::regclass),
    "nombre" VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS "control financiero"."observaciones" (
    "id_observacion" INTEGER NOT NULL DEFAULT nextval('"control financiero".observaciones_id_observacion_seq'::regclass),
    "matricula" VARCHAR(20) NOT NULL,
    "tipo_clave" VARCHAR(30) NOT NULL,
    "detalle" TEXT NOT NULL,
    "id_autor" INTEGER,
    "fecha" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "control financiero"."permisos" (
    "id_permiso" INTEGER NOT NULL DEFAULT nextval('"control financiero".permisos_id_permiso_seq'::regclass),
    "clave" CHARACTER VARYING NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" CHARACTER VARYING NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "control financiero"."rol_permisos" (
    "id_rol_permiso" INTEGER NOT NULL DEFAULT nextval('"control financiero".rol_permisos_id_seq'::regclass),
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "control financiero"."roles" (
    "id_rol" INTEGER NOT NULL DEFAULT nextval('"control financiero".roles_id_rol_seq'::regclass),
    "nombre_rol" VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS "control financiero"."tipos_observacion" (
    "clave" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "control financiero"."usuario_permisos" (
    "id_usuario_permiso" INTEGER NOT NULL DEFAULT nextval('"control financiero".usuario_permisos_id_seq'::regclass),
    "id_usuario" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,
    "otorgado" BOOLEAN NOT NULL,
    "razon" CHARACTER VARYING,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "modificado_por" INTEGER
);

CREATE TABLE IF NOT EXISTS "control financiero"."usuarios" (
    "id_usuario" INTEGER NOT NULL DEFAULT nextval('"control financiero".usuarios_id_usuario_seq'::regclass),
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "id_carrera" INTEGER,
    "email" VARCHAR(255),
    "activo" BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS "control financiero"."usuarios_identidades" (
    "id_identidad" INTEGER NOT NULL DEFAULT nextval('"control financiero".usuarios_identidades_id_identidad_seq'::regclass),
    "id_usuario" INTEGER NOT NULL,
    "proveedor" VARCHAR(50) NOT NULL,
    "proveedor_sub" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "email_verificado" BOOLEAN DEFAULT false,
    "nombre" VARCHAR(255),
    "foto_url" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================================================
-- CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, UNIQUE, CHECK)
-- ==============================================================================

ALTER TABLE "control financiero".tipos_observacion ADD CONSTRAINT "tipos_observacion_pkey" PRIMARY KEY (clave);
ALTER TABLE "control financiero".permisos ADD CONSTRAINT "permisos_pkey" PRIMARY KEY (id_permiso);
ALTER TABLE "control financiero".permisos ADD CONSTRAINT "permisos_clave_key" UNIQUE (clave);
ALTER TABLE "control financiero".carreras ADD CONSTRAINT "carreras_duracion_semestres_check" CHECK ((duracion_semestres > 0));
ALTER TABLE "control financiero".carreras ADD CONSTRAINT "carreras_clave_check" CHECK (((clave)::text ~ '^[a-zA-Z0-9_-]+$'::text));
ALTER TABLE "control financiero".carreras ADD CONSTRAINT "carreras_pkey" PRIMARY KEY (id_carrera);
ALTER TABLE "control financiero".carreras ADD CONSTRAINT "carreras_clave_key" UNIQUE (clave);
ALTER TABLE "control financiero".roles ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id_rol);
ALTER TABLE "control financiero".roles ADD CONSTRAINT "roles_nombre_rol_key" UNIQUE (nombre_rol);
ALTER TABLE "control financiero".metodos_pago ADD CONSTRAINT "metodos_pago_pkey" PRIMARY KEY (id_metodo);
ALTER TABLE "control financiero".metodos_pago ADD CONSTRAINT "metodos_pago_nombre_key" UNIQUE (nombre);
ALTER TABLE "control financiero".ciclos_escolares ADD CONSTRAINT "check_fechas" CHECK ((fecha_fin >= fecha_inicio));
ALTER TABLE "control financiero".ciclos_escolares ADD CONSTRAINT "ciclos_escolares_pkey" PRIMARY KEY (id_ciclo);
ALTER TABLE "control financiero".ciclos_escolares ADD CONSTRAINT "ciclos_escolares_nombre_key" UNIQUE (nombre);
ALTER TABLE "control financiero".conceptos ADD CONSTRAINT "conceptos_monto_default_check" CHECK ((monto_default >= (0)::numeric));
ALTER TABLE "control financiero".conceptos ADD CONSTRAINT "conceptos_pkey" PRIMARY KEY (clave);
ALTER TABLE "control financiero".alumnos ADD CONSTRAINT "alumnos_semestre_actual_check" CHECK ((semestre_actual > 0));
ALTER TABLE "control financiero".alumnos ADD CONSTRAINT "alumnos_pkey" PRIMARY KEY (matricula);
ALTER TABLE "control financiero".alumnos ADD CONSTRAINT "alumnos_email_institucional_key" UNIQUE (email_institucional);
ALTER TABLE "control financiero".alumnos ADD CONSTRAINT "fk_alumno_carrera" FOREIGN KEY (id_carrera) REFERENCES "control financiero".carreras(id_carrera);
ALTER TABLE "control financiero".usuarios ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY (id_usuario);
ALTER TABLE "control financiero".usuarios ADD CONSTRAINT "usuarios_username_key" UNIQUE (username);
ALTER TABLE "control financiero".usuarios ADD CONSTRAINT "usuarios_email_key" UNIQUE (email);
ALTER TABLE "control financiero".usuarios ADD CONSTRAINT "usuarios_id_carrera_fkey" FOREIGN KEY (id_carrera) REFERENCES "control financiero".carreras(id_carrera) ON DELETE SET NULL;
ALTER TABLE "control financiero".usuarios ADD CONSTRAINT "fk_usuario_rol" FOREIGN KEY (id_rol) REFERENCES "control financiero".roles(id_rol);
ALTER TABLE "control financiero".usuarios_identidades ADD CONSTRAINT "usuarios_identidades_proveedor_check" CHECK (((proveedor)::text = ANY ((ARRAY['GOOGLE'::character varying, 'MICROSOFT'::character varying])::text[])));
ALTER TABLE "control financiero".usuarios_identidades ADD CONSTRAINT "usuarios_identidades_pkey" PRIMARY KEY (id_identidad);
ALTER TABLE "control financiero".usuarios_identidades ADD CONSTRAINT "usuarios_identidades_proveedor_proveedor_sub_key" UNIQUE (proveedor, proveedor_sub);
ALTER TABLE "control financiero".usuarios_identidades ADD CONSTRAINT "usuarios_identidades_id_usuario_fkey" FOREIGN KEY (id_usuario) REFERENCES "control financiero".usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE "control financiero".observaciones ADD CONSTRAINT "observaciones_pkey" PRIMARY KEY (id_observacion);
ALTER TABLE "control financiero".observaciones ADD CONSTRAINT "fk_observacion_alumno" FOREIGN KEY (matricula) REFERENCES "control financiero".alumnos(matricula) ON DELETE CASCADE;
ALTER TABLE "control financiero".observaciones ADD CONSTRAINT "fk_observacion_autor" FOREIGN KEY (id_autor) REFERENCES "control financiero".usuarios(id_usuario);
ALTER TABLE "control financiero".observaciones ADD CONSTRAINT "fk_observaciones_tipo" FOREIGN KEY (tipo_clave) REFERENCES "control financiero".tipos_observacion(clave) ON UPDATE CASCADE;
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "cuentas_por_cobrar_monto_check" CHECK ((monto >= (0)::numeric));
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "cuentas_por_cobrar_pkey" PRIMARY KEY (id_cuenta);
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "fk_cxc_alumno" FOREIGN KEY (matricula) REFERENCES "control financiero".alumnos(matricula) ON DELETE CASCADE;
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "fk_cxc_ciclo" FOREIGN KEY (id_ciclo) REFERENCES "control financiero".ciclos_escolares(id_ciclo);
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "fk_cxc_metodo_pago" FOREIGN KEY (id_metodo) REFERENCES "control financiero".metodos_pago(id_metodo);
ALTER TABLE "control financiero".cuentas_por_cobrar ADD CONSTRAINT "fk_cuentas_por_cobrar_concepto" FOREIGN KEY (concepto) REFERENCES "control financiero".conceptos(clave) ON UPDATE CASCADE;
ALTER TABLE "control financiero".bitacora_auditoria ADD CONSTRAINT "bitacora_auditoria_pkey" PRIMARY KEY (id_log);
ALTER TABLE "control financiero".bitacora_auditoria ADD CONSTRAINT "bitacora_auditoria_id_usuario_fkey" FOREIGN KEY (id_usuario) REFERENCES "control financiero".usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE "control financiero".rol_permisos ADD CONSTRAINT "rol_permisos_pkey" PRIMARY KEY (id_rol_permiso);
ALTER TABLE "control financiero".rol_permisos ADD CONSTRAINT "uk_rol_permiso" UNIQUE (id_rol, id_permiso);
ALTER TABLE "control financiero".rol_permisos ADD CONSTRAINT "fk_rol_permiso_rol" FOREIGN KEY (id_rol) REFERENCES "control financiero".roles(id_rol) ON DELETE CASCADE;
ALTER TABLE "control financiero".rol_permisos ADD CONSTRAINT "fk_rol_permiso_permiso" FOREIGN KEY (id_permiso) REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE;
ALTER TABLE "control financiero".usuario_permisos ADD CONSTRAINT "usuario_permisos_pkey" PRIMARY KEY (id_usuario_permiso);
ALTER TABLE "control financiero".usuario_permisos ADD CONSTRAINT "uk_usuario_permiso" UNIQUE (id_usuario, id_permiso);
ALTER TABLE "control financiero".usuario_permisos ADD CONSTRAINT "fk_usuario_permiso_usuario" FOREIGN KEY (id_usuario) REFERENCES "control financiero".usuarios(id_usuario) ON DELETE CASCADE;
ALTER TABLE "control financiero".usuario_permisos ADD CONSTRAINT "fk_usuario_permiso_permiso" FOREIGN KEY (id_permiso) REFERENCES "control financiero".permisos(id_permiso) ON DELETE CASCADE;
ALTER TABLE "control financiero".usuario_permisos ADD CONSTRAINT "fk_usuario_permiso_modificador" FOREIGN KEY (modificado_por) REFERENCES "control financiero".usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE "control financiero".permisos ADD CONSTRAINT "check_clave_format" CHECK (((clave)::text ~ '^[a-z._]+$'::text));

-- ==============================================================================
-- ÍNDICES
-- ==============================================================================

CREATE INDEX idx_alumnos_carrera ON "control financiero".alumnos USING btree (id_carrera);
CREATE UNIQUE INDEX alumnos_pkey ON "control financiero".alumnos USING btree (matricula);
CREATE UNIQUE INDEX alumnos_email_institucional_key ON "control financiero".alumnos USING btree (email_institucional);
CREATE UNIQUE INDEX bitacora_auditoria_pkey ON "control financiero".bitacora_auditoria USING btree (id_log);
CREATE UNIQUE INDEX carreras_pkey ON "control financiero".carreras USING btree (id_carrera);
CREATE UNIQUE INDEX carreras_clave_key ON "control financiero".carreras USING btree (clave);
CREATE UNIQUE INDEX ciclos_escolares_nombre_key ON "control financiero".ciclos_escolares USING btree (nombre);
CREATE UNIQUE INDEX ciclos_escolares_pkey ON "control financiero".ciclos_escolares USING btree (id_ciclo);
CREATE UNIQUE INDEX conceptos_pkey ON "control financiero".conceptos USING btree (clave);
CREATE UNIQUE INDEX cuentas_por_cobrar_pkey ON "control financiero".cuentas_por_cobrar USING btree (id_cuenta);
CREATE UNIQUE INDEX idx_cxc_matricula_concepto_ciclo ON "control financiero".cuentas_por_cobrar USING btree (matricula, concepto, id_ciclo);
CREATE INDEX idx_cxc_matricula ON "control financiero".cuentas_por_cobrar USING btree (matricula);
CREATE INDEX idx_cxc_pagado ON "control financiero".cuentas_por_cobrar USING btree (pagado);
CREATE UNIQUE INDEX metodos_pago_nombre_key ON "control financiero".metodos_pago USING btree (nombre);
CREATE UNIQUE INDEX metodos_pago_pkey ON "control financiero".metodos_pago USING btree (id_metodo);
CREATE UNIQUE INDEX observaciones_pkey ON "control financiero".observaciones USING btree (id_observacion);
CREATE INDEX idx_observaciones_tipo ON "control financiero".observaciones USING btree (tipo_clave);
CREATE UNIQUE INDEX permisos_pkey ON "control financiero".permisos USING btree (id_permiso);
CREATE UNIQUE INDEX permisos_clave_key ON "control financiero".permisos USING btree (clave);
CREATE UNIQUE INDEX rol_permisos_pkey ON "control financiero".rol_permisos USING btree (id_rol_permiso);
CREATE UNIQUE INDEX uk_rol_permiso ON "control financiero".rol_permisos USING btree (id_rol, id_permiso);
CREATE UNIQUE INDEX roles_pkey ON "control financiero".roles USING btree (id_rol);
CREATE UNIQUE INDEX roles_nombre_rol_key ON "control financiero".roles USING btree (nombre_rol);
CREATE UNIQUE INDEX tipos_observacion_pkey ON "control financiero".tipos_observacion USING btree (clave);
CREATE UNIQUE INDEX uk_usuario_permiso ON "control financiero".usuario_permisos USING btree (id_usuario, id_permiso);
CREATE UNIQUE INDEX usuario_permisos_pkey ON "control financiero".usuario_permisos USING btree (id_usuario_permiso);
CREATE UNIQUE INDEX usuarios_username_key ON "control financiero".usuarios USING btree (username);
CREATE INDEX idx_usuarios_carrera ON "control financiero".usuarios USING btree (id_carrera);
CREATE UNIQUE INDEX usuarios_email_key ON "control financiero".usuarios USING btree (email);
CREATE UNIQUE INDEX usuarios_pkey ON "control financiero".usuarios USING btree (id_usuario);
CREATE UNIQUE INDEX usuarios_identidades_pkey ON "control financiero".usuarios_identidades USING btree (id_identidad);
CREATE UNIQUE INDEX usuarios_identidades_proveedor_proveedor_sub_key ON "control financiero".usuarios_identidades USING btree (proveedor, proveedor_sub);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

CREATE TRIGGER "trg_validar_scope_usuario"
  BEFORE INSERT ON "control financiero"."usuarios"
  FOR EACH row
  EXECUTE FUNCTION "control financiero".validar_scope_usuario();

CREATE TRIGGER "trg_validar_scope_usuario"
  BEFORE UPDATE ON "control financiero"."usuarios"
  FOR EACH row
  EXECUTE FUNCTION "control financiero".validar_scope_usuario();

