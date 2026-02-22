"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudService = void 0;
// src/services/crud.service.ts
const data_1 = require("../data");
const db_schema_1 = require("../shared/db-schema");
class CrudService {
    constructor(table, idColumn, idIsNumber = true) {
        this.table = table;
        this.idColumn = idColumn;
        this.idIsNumber = idIsNumber;
        this.tableRef = `${db_schema_1.DB_SCHEMA}.${this.table}`;
    }
    normalizeId(id) {
        if (this.idIsNumber && typeof id === 'string') {
            const parsed = Number(id);
            if (Number.isNaN(parsed)) {
                throw new Error(`ID inválido para ${this.table}: ${id}`);
            }
            return parsed;
        }
        return id;
    }
    // Helper to build scoped query WHERE clauses
    buildScopeClause(options, existingWhereParamsCount = 0) {
        if (options?.scopeParams && options.scopeParams.idCarrera !== null) {
            const paramIndex = existingWhereParamsCount + 1;
            return {
                clause: ` AND ${options.scopeParams.tableField} = $${paramIndex}`,
                value: options.scopeParams.idCarrera,
                hasScope: true
            };
        }
        return { clause: '', value: null, hasScope: false };
    }
    async getAll(options) {
        let sql = `SELECT * FROM ${this.tableRef} WHERE 1=1`;
        const values = [];
        const scope = this.buildScopeClause(options, values.length);
        if (scope.hasScope) {
            sql += scope.clause;
            values.push(scope.value);
        }
        const { rows } = await data_1.dbPool.query(sql, values);
        return rows;
    }
    async getById(id, options) {
        const value = this.normalizeId(id);
        let sql = `SELECT * FROM ${this.tableRef} WHERE ${this.idColumn} = $1`;
        const values = [value];
        const scope = this.buildScopeClause(options, values.length);
        if (scope.hasScope) {
            sql += scope.clause;
            values.push(scope.value);
        }
        const { rows } = await data_1.dbPool.query(sql, values);
        return rows[0] || null;
    }
    async create(data) {
        const keys = Object.keys(data);
        if (keys.length === 0) {
            throw new Error('No hay datos para insertar');
        }
        const columns = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        const values = keys.map((k) => data[k]);
        const sql = `
      INSERT INTO ${this.tableRef} (${columns})
      VALUES (${placeholders})
      RETURNING *;
    `;
        const { rows } = await data_1.dbPool.query(sql, values);
        return rows[0];
    }
    async update(id, data) {
        const value = this.normalizeId(id);
        // Evitar que se actualice la PK
        const keys = Object.keys(data).filter((k) => k !== this.idColumn);
        if (keys.length === 0) {
            throw new Error('No hay datos para actualizar');
        }
        const setClause = keys
            .map((k, idx) => `"${k}" = $${idx + 1}`)
            .join(', ');
        const values = keys.map((k) => data[k]);
        values.push(value);
        const sql = `
      UPDATE ${this.tableRef}
      SET ${setClause}
      WHERE "${this.idColumn}" = $${keys.length + 1}
      RETURNING *;
    `;
        const { rows } = await data_1.dbPool.query(sql, values);
        return rows[0] || null;
    }
    async delete(id) {
        const value = this.normalizeId(id);
        const sql = `
      DELETE FROM ${this.tableRef}
      WHERE ${this.idColumn} = $1
      RETURNING *;
    `;
        const { rows } = await data_1.dbPool.query(sql, [value]);
        return rows[0] || null;
    }
}
exports.CrudService = CrudService;
