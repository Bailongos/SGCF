"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlumnosService = void 0;
const data_1 = require("../data");
const SCHEMA = `"control financiero"`; // o control_financiero si lo renombraste
class AlumnosService {
    static async getAll() {
        const sql = `SELECT * FROM ${SCHEMA}.alumnos`;
        const { rows } = await data_1.dbPool.query(sql);
        return rows;
    }
}
exports.AlumnosService = AlumnosService;
