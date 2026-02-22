"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crud_service_1 = require("../../services/crud.service");
const crud_routes_1 = require("../shared/crud.routes");
const pagosService = new crud_service_1.CrudService('pagos', 'id_pago', true);
exports.default = (0, crud_routes_1.buildCrudRoutes)(pagosService, 'id');
