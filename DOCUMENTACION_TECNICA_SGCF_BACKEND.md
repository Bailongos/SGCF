# Documentacion Tecnica SGCF

Revision basada en el repositorio `SGCF` ubicado en `C:\Users\NEWMM\Desktop\uadec\SGCF`.

Fecha de revision: 2026-05-21

## 1. Alcance real del repositorio

Este repositorio contiene el backend del Sistema Gestor de Control Financiero (SGCF), junto con scripts SQL y utilidades de soporte.

No se encontro dentro de este proyecto un frontend en Vue, Vite, Pinia o archivos `.vue`. Por lo tanto, cualquier documentacion de vistas, componentes, router o stores corresponde a otro repositorio o a una arquitectura esperada, pero no al codigo presente aqui.

## 2. Stack tecnico real

- Runtime: Node.js
- Lenguaje: TypeScript
- Framework HTTP: Fastify
- Base de datos: PostgreSQL
- Autenticacion: JWT, login local, Google OAuth y Microsoft OAuth
- Seguridad HTTP: `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`
- Acceso a datos: `pg`
- Hash de contrasenas: `bcryptjs`

Dependencias visibles en `package.json`:

- `fastify`
- `pg`
- `jsonwebtoken`
- `google-auth-library`
- `jwks-rsa`
- `@azure/msal-node`

## 3. Estructura principal del backend

- `src/app.ts`: punto de entrada. Valida la conexion a BD y levanta el servidor.
- `src/presentation/server.ts`: configura Fastify, CORS, Helmet, rate limit, `/health` y el hook global de autenticacion.
- `src/presentation/routes.ts`: registra los modulos de la API.
- `src/presentation/auth/*`: autenticacion local y federada.
- `src/presentation/shared/auth.middleware.ts`: valida JWT y permite fallback con headers manuales.
- `src/services/crud.service.ts`: CRUD generico para varias tablas.
- `src/data/db-connection.ts`: pool de PostgreSQL y `search_path` al esquema `"control financiero"`.
- `schema.sql`: definicion principal del esquema y datos semilla.
- `src/data/migrations/*.sql`: migraciones complementarias.

## 4. Variables de entorno reales

El backend usa estas variables:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`

## 5. Seguridad y autenticacion

### 5.1 Politica general

- `/health` es publico.
- `/api/auth/*` es publico.
- El resto de rutas bajo `/api` pasan por `authMiddleware`.

### 5.2 Mecanismos soportados

- Bearer token JWT por header `Authorization`.
- Fallback con headers `x-user-id` y `x-user-carrera`.

### 5.3 Comportamientos relevantes

- Login local con usuario y contrasena.
- Registro local con usuario inicialmente inactivo.
- Login Google con verificacion de `id_token`.
- Login Microsoft con validacion JWT por JWKS.
- Restriccion de dominio institucional para Microsoft: `@uadec.mx` y `@mail.uadec.mx`.
- Construccion de permisos combinando `rol_permisos` y `usuario_permisos`.

## 6. Endpoints reales del proyecto

### 6.1 Salud del servicio

- `GET /health`

### 6.2 Autenticacion

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/google`
- `POST /api/auth/microsoft`

### 6.3 Modulos CRUD o semigenericos

- `GET /api/alumnos`
- `GET /api/alumnos/:matricula`
- `POST /api/alumnos`
- `PUT /api/alumnos/:matricula`
- `DELETE /api/alumnos/:matricula`

- `GET /api/carreras`
- `GET /api/carreras/:id`
- `POST /api/carreras`
- `PUT /api/carreras/:id`
- `DELETE /api/carreras/:id`
- `GET /api/carreras/by-clave/:clave`

- `GET /api/ciclos-escolares`
- `GET /api/ciclos-escolares/:id`
- `POST /api/ciclos-escolares`
- `PUT /api/ciclos-escolares/:id`
- `DELETE /api/ciclos-escolares/:id`
- `POST /api/ciclos-escolares/auto`

- `GET /api/conceptos`
- `GET /api/conceptos/:id`
- `POST /api/conceptos`
- `PUT /api/conceptos/:id`
- `DELETE /api/conceptos/:id`

Nota: en `conceptos`, el parametro `:id` corresponde realmente a la columna `clave`.

- `GET /api/metodos-pago`
- `GET /api/metodos-pago/:id`
- `POST /api/metodos-pago`
- `PUT /api/metodos-pago/:id`
- `DELETE /api/metodos-pago/:id`

- `GET /api/roles`
- `GET /api/roles/:id`
- `POST /api/roles`
- `PUT /api/roles/:id`
- `DELETE /api/roles/:id`

- `GET /api/usuarios`
- `GET /api/usuarios/:id`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`
- `DELETE /api/usuarios/:id`

Nota: `usuarios` tiene una restriccion de acceso para administradores globales.

- `GET /api/cuentas`
- `GET /api/cuentas/:id`
- `POST /api/cuentas`
- `PUT /api/cuentas/:id`
- `DELETE /api/cuentas/:id`

- `GET /api/bitacora`
- `GET /api/bitacora/:id`
- `POST /api/bitacora`
- `PUT /api/bitacora/:id`
- `DELETE /api/bitacora/:id`

### 6.4 Modulos con logica personalizada

- `GET /api/observaciones`
- `POST /api/observaciones`
- `GET /api/observaciones/:id`

Filtros soportados en `GET /api/observaciones`:

- `matricula`
- `tipo`
- `desde`
- `hasta`
- `autor`

- `GET /api/tipos-observacion`

### 6.5 Modulo administrativo

- `GET /api/admin/usuarios`
- `POST /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id`
- `GET /api/admin/roles`
- `GET /api/admin/carreras`
- `GET /api/admin/auditoria`

### 6.6 Rutas registradas con inconsistencia actual

Estas rutas existen en el backend, pero no se encontraron sus tablas en `schema.sql` ni en las migraciones revisadas:

- `GET/POST/PUT/DELETE /api/becas...`
- `GET/POST/PUT/DELETE /api/pagos...`

Esto significa que actualmente estan registradas a nivel API, pero no quedan respaldadas claramente por el esquema SQL presente en este repo.

## 7. Modelo de datos real

El esquema principal es `"control financiero"`.

### 7.1 Tablas encontradas en `schema.sql`

- `carreras`
- `roles`
- `permisos`
- `rol_permisos`
- `usuario_permisos`
- `metodos_pago`
- `ciclos_escolares`
- `conceptos`
- `tipos_observacion`
- `alumnos`
- `usuarios`
- `usuarios_identidades`
- `observaciones`
- `cuentas_por_cobrar`
- `bitacora_auditoria`

### 7.2 Reglas relevantes de base de datos

- `usuarios` valida alcance por rol mediante trigger `trg_validar_scope_usuario`.
- `Administrador` debe tener `id_carrera = NULL`.
- `Coordinador` debe tener `id_carrera` asignada.
- `cuentas_por_cobrar` impone unicidad por `matricula + concepto + id_ciclo`.
- `observaciones` relaciona alumno, autor y tipo de observacion.

### 7.3 Datos semilla

Se insertan por defecto:

- Roles: `Administrador`, `Coordinador`, `Caja`, `Pendiente`
- Metodos de pago: `Efectivo`, `Tarjeta Debito/Credito`, `Transferencia`
- Conceptos: `UADEC`, `ESCUELA`
- Tipos de observacion: `GENERAL`, `ACADEMICA`, `CONDUCTA`, `FINANCIERA`
- Usuario admin por defecto

## 8. Comportamientos funcionales detectados

### 8.1 Alumnos

- La consulta de alumnos hace `JOIN` con `carreras`.
- Si el usuario tiene `id_carrera`, el listado queda filtrado por carrera.
- Al crear un alumno, el backend intenta generar automaticamente dos cuentas por cobrar base: `UADEC` y `ESCUELA`, siempre que exista un ciclo actual.

### 8.2 Carreras

- Se valida el formato de `clave`.
- Se valida que `clave` no se repita.
- Existe consulta adicional por clave: `/by-clave/:clave`.

### 8.3 Ciclos escolares

- Existe una ruta `POST /api/ciclos-escolares/auto` que detecta o crea el ciclo vigente y marca `es_actual`.

### 8.4 Observaciones

- Soportan filtros por matricula, tipo, fecha y autor.
- Aplican restriccion por carrera si el usuario esta limitado por scope.
- Solo se detectaron endpoints de lectura y alta; no se detectaron endpoints de edicion o eliminacion.

### 8.5 Usuarios y administracion

- `/api/usuarios` esta restringido a administradores globales.
- `/api/admin/usuarios` permite administracion con reglas de alcance por carrera.
- Los cambios administrativos relevantes pueden registrarse en `bitacora_auditoria`.

### 8.6 OAuth

- Si un usuario OAuth no existe, puede crearse automaticamente.
- El flujo registra actividad en bitacora.

## 9. Diferencias clave contra el documento original revisado

### 9.1 Frontend

El documento original describe un frontend completo en Vue 3, Vite, Pinia, Axios, vistas y componentes. Ese frontend no esta en este repositorio.

### 9.2 Backend subdocumentado

El documento original afirmaba que el backend actual solo tenia implementado `alumnos`. Eso ya no es correcto: el proyecto registra muchos modulos adicionales en `src/presentation/routes.ts`.

### 9.3 Recomendaciones ya implementadas

El documento sugeria:

- agregar middleware de autenticacion en backend
- unificar prefijos `/api`
- agregar health check

Todo eso ya existe en el codigo actual.

### 9.4 Endpoints documentados vs endpoints reales

El documento original documentaba CRUD completos para algunos modulos que aqui no coinciden exactamente. Ejemplo: `observaciones` no muestra `PUT` ni `DELETE` en el codigo revisado.

### 9.5 Inconsistencias reales del repo

Las rutas `becas` y `pagos` quedaron registradas en la API, pero no fue posible confirmar sus tablas en el esquema SQL actual.

## 10. Riesgos y pendientes tecnicos actuales

- No se detectaron pruebas automatizadas en el repo.
- No se detecto documentacion OpenAPI/Swagger.
- Varias rutas usan CRUD generico sin esquemas de validacion de payload.
- Existen rutas registradas (`becas`, `pagos`) sin respaldo evidente en el esquema revisado.
- El middleware permite fallback por headers manuales, lo cual es util para compatibilidad, pero mas debil que exigir JWT en todos los clientes.

## 11. Conclusion

Este proyecto si representa un backend funcional de SGCF sobre Fastify y PostgreSQL, con autenticacion local y federada, control por carrera, catalogos, alumnos, cuentas por cobrar, observaciones, usuarios y administracion.

La documentacion original no estaba completamente alineada porque mezclaba informacion de un frontend no presente aqui y describia un backend mas pequeno del que realmente existe hoy.

La version correcta para este repositorio debe tratarlo como backend, documentar sus endpoints actuales, su esquema real y dejar marcadas las inconsistencias pendientes de `becas` y `pagos`.
