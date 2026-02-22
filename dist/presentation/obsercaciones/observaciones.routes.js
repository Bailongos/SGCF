"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crud_service_1 = require("../../services/crud.service");
const crud_routes_1 = require("../shared/crud.routes");
const observacionesService = new crud_service_1.CrudService('observaciones', 'id_observacion', true);
exports.default = (0, crud_routes_1.buildCrudRoutes)(observacionesService, 'id', {
    resolveScope: (req) => {
        const user = req.user;
        if (user?.id_carrera) {
            return {
                scopeParams: {
                    tableField: `(SELECT id_carrera FROM "control financiero".alumnos a WHERE a.matricula = "control financiero".observaciones.matricula)`,
                    idCarrera: user.id_carrera
                }
            };
        }
        return undefined;
    }
});
