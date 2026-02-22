"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend: conceptos.routes.ts
const crud_service_1 = require("../../services/crud.service");
const crud_routes_1 = require("../shared/crud.routes");
// usamos la tabla conceptos y la columna "clave" como llave **NO numérica**
const conceptosService = new crud_service_1.CrudService('conceptos', 'clave', false);
exports.default = (0, crud_routes_1.buildCrudRoutes)(conceptosService, 'id');
