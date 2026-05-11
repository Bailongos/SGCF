-- ==============================================================================
-- SISTEMA GESTOR DE CONTROL FINANCIERO - ESQUEMA COMPLETO Y ACTUALIZADO
-- (PostgreSQL)
-- ==============================================================================

-- 0. Crear esquema y configurarlo
CREATE SCHEMA IF NOT EXISTS "control financiero";
SET search_path TO "control financiero", public;

-- 1. Limpieza inicial (Descomentar solo si necesitas reiniciar la BD desde cero)
-- DROP TABLE IF EXISTS bitacora_auditoria CASCADE;
-- DROP TABLE IF EXISTS usuarios_identidades CASCADE;
-- DROP TABLE IF EXISTS cuentas_por_cobrar CASCADE;
-- DROP TABLE IF EXISTS observaciones CASCADE;
-- DROP TABLE IF EXISTS tipos_observacion CASCADE;
-- DROP TABLE IF EXISTS usuarios CASCADE;
-- DROP TABLE IF EXISTS alumnos CASCADE;
-- DROP TABLE IF EXISTS conceptos CASCADE;
-- DROP TABLE IF EXISTS ciclos_escolares CASCADE;
-- DROP TABLE IF EXISTS metodos_pago CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- DROP TABLE IF EXISTS carreras CASCADE;

-- ==============================================================================
-- MÓDULO DE CATÁLOGOS (Tablas Independientes)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS carreras (
    id_carrera SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    duracion_semestres INTEGER NOT NULL CHECK (duracion_semestres > 0),
    clave VARCHAR(20) NOT NULL UNIQUE CHECK (clave ~ '^[a-zA-Z0-9_-]+$')
);

CREATE TABLE IF NOT EXISTS roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permisos (
    id_permiso SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    categoria VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    id_rol INTEGER NOT NULL REFERENCES roles(id_rol) ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL REFERENCES permisos(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE IF NOT EXISTS usuario_permisos (
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL REFERENCES permisos(id_permiso) ON DELETE CASCADE,
    otorgado BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_usuario, id_permiso)
);

CREATE TABLE IF NOT EXISTS metodos_pago (
    id_metodo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ciclos_escolares (
    id_ciclo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    es_actual BOOLEAN DEFAULT FALSE,
    CONSTRAINT check_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS conceptos (
    clave VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    monto_default NUMERIC(10,2) NOT NULL CHECK (monto_default >= 0),
    genera_cuenta_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tipos_observacion (
    clave VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- MÓDULO DE ALUMNOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS alumnos (
    matricula VARCHAR(20) PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email_institucional VARCHAR(100) UNIQUE,
    telefono_contacto VARCHAR(20),
    id_carrera INTEGER NOT NULL,
    semestre_actual INTEGER DEFAULT 1 CHECK (semestre_actual > 0),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alumno_carrera FOREIGN KEY (id_carrera) REFERENCES carreras(id_carrera)
);

-- ==============================================================================
-- MÓDULO DE USUARIOS Y SEGURIDAD
-- ==============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    id_rol INTEGER NOT NULL,
    id_carrera INTEGER REFERENCES carreras(id_carrera) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- Regla de negocio: Alcance de usuarios (Global vs Carrera)
CREATE OR REPLACE FUNCTION validar_scope_usuario()
RETURNS TRIGGER AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT nombre_rol INTO v_rol FROM roles WHERE id_rol = NEW.id_rol;

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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_scope_usuario ON usuarios;
CREATE TRIGGER trg_validar_scope_usuario
BEFORE INSERT OR UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION validar_scope_usuario();

-- Identidades OAuth
CREATE TABLE IF NOT EXISTS usuarios_identidades (
    id_identidad SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
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

-- ==============================================================================
-- MÓDULO DE OBSERVACIONES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS observaciones (
    id_observacion SERIAL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    tipo_clave VARCHAR(30) NOT NULL,
    detalle TEXT NOT NULL,
    id_autor INTEGER,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_observacion_alumno FOREIGN KEY (matricula) REFERENCES alumnos(matricula) ON DELETE CASCADE,
    CONSTRAINT fk_observacion_autor FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_observaciones_tipo FOREIGN KEY (tipo_clave) REFERENCES tipos_observacion(clave) ON UPDATE CASCADE
);

-- ==============================================================================
-- MÓDULO FINANCIERO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id_cuenta SERIAL PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    concepto VARCHAR(20) NOT NULL,
    id_ciclo INTEGER NOT NULL,
    monto NUMERIC(10, 2) NOT NULL CHECK (monto >= 0),
    pagado BOOLEAN DEFAULT FALSE,
    fecha_pago DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_metodo INTEGER,
    
    CONSTRAINT fk_cxc_alumno FOREIGN KEY (matricula) REFERENCES alumnos(matricula) ON DELETE CASCADE,
    CONSTRAINT fk_cxc_ciclo FOREIGN KEY (id_ciclo) REFERENCES ciclos_escolares(id_ciclo),
    CONSTRAINT fk_cxc_metodo_pago FOREIGN KEY (id_metodo) REFERENCES metodos_pago(id_metodo),
    CONSTRAINT fk_cuentas_por_cobrar_concepto FOREIGN KEY (concepto) REFERENCES conceptos(clave) ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cxc_matricula_concepto_ciclo
    ON cuentas_por_cobrar(matricula, concepto, id_ciclo);

-- ==============================================================================
-- MÓDULO DE AUDITORÍA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bitacora_auditoria (
    id_log SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES ADICIONALES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_alumnos_carrera ON alumnos(id_carrera);
CREATE INDEX IF NOT EXISTS idx_cxc_matricula ON cuentas_por_cobrar(matricula);
CREATE INDEX IF NOT EXISTS idx_cxc_pagado ON cuentas_por_cobrar(pagado);
CREATE INDEX IF NOT EXISTS idx_usuarios_carrera ON usuarios(id_carrera);
CREATE INDEX IF NOT EXISTS idx_observaciones_tipo ON observaciones(tipo_clave);

-- ==============================================================================
-- DATOS SEMILLA (Inicialización requerida)
-- ==============================================================================

-- Roles bases
INSERT INTO roles (nombre_rol) VALUES 
('Administrador'), ('Coordinador'), ('Caja'), ('Pendiente') 
ON CONFLICT DO NOTHING;

-- Métodos de pago
INSERT INTO metodos_pago (nombre) VALUES 
('Efectivo'), ('Tarjeta Débito/Crédito'), ('Transferencia') 
ON CONFLICT DO NOTHING;

-- Conceptos por defecto
INSERT INTO conceptos (clave, descripcion, monto_default, genera_cuenta_default) VALUES
('UADEC', 'Colegial UADEC', 4500.00, TRUE),
('ESCUELA', 'Colegiatura Escuela', 800.00, TRUE) 
ON CONFLICT DO NOTHING;

-- Tipos de observación
INSERT INTO tipos_observacion (clave, nombre) VALUES
('GENERAL', 'Observación General'),
('ACADEMICA', 'Situación Académica'),
('CONDUCTA', 'Conducta / Disciplina'),
('FINANCIERA', 'Temas de Pago / Deuda') 
ON CONFLICT DO NOTHING;

-- Usuario Admin por defecto vinculado al primer rol 'Administrador'
DO $$
DECLARE
  v_admin_role INT;
BEGIN
  SELECT id_rol INTO v_admin_role FROM roles WHERE nombre_rol = 'Administrador' LIMIT 1;

  INSERT INTO usuarios (username, password, id_rol, id_carrera, activo)
  VALUES ('admin', '$2b$10$2qpnswc97tbwpHRTTkSZr.NPP./14J1N.nvmgppHOHwX9GKLTkOP9i', v_admin_role, NULL, TRUE) 
  -- Contraseña default es: admin123 (hasheada en bcrypt)
  ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;
END $$;
