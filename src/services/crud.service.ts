// src/services/crud.service.ts
import { dbPool } from '../data';
import { DB_SCHEMA } from '../shared/db-schema';

export interface CrudOptions {
  scopeParams?: {
    tableField: string;
    idCarrera: number | null;
  };
}

export class CrudService {
  private tableRef: string;

  constructor(
    private table: string,
    private idColumn: string,
    private idIsNumber: boolean = true, // para matricula usamos false
  ) {
    this.tableRef = `${DB_SCHEMA}.${this.table}`;
  }

  private normalizeId(id: string | number) {
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
  private buildScopeClause(options?: CrudOptions, existingWhereParamsCount: number = 0) {
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

  async getAll(options?: CrudOptions) {
    let sql = `SELECT * FROM ${this.tableRef} WHERE 1=1`;
    const values: any[] = [];
    
    const scope = this.buildScopeClause(options, values.length);
    if (scope.hasScope) {
      sql += scope.clause;
      values.push(scope.value);
    }

    const { rows } = await dbPool.query(sql, values);
    return rows;
  }

  async getById(id: string | number, options?: CrudOptions) {
    const value = this.normalizeId(id);
    let sql = `SELECT * FROM ${this.tableRef} WHERE ${this.idColumn} = $1`;
    const values: any[] = [value];

    const scope = this.buildScopeClause(options, values.length);
    if (scope.hasScope) {
      sql += scope.clause;
      values.push(scope.value);
    }

    const { rows } = await dbPool.query(sql, values);
    return rows[0] || null;
  }

  async create(data: Record<string, any>) {
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

    const { rows } = await dbPool.query(sql, values);
    return rows[0];
  }

  async update(id: string | number, data: Record<string, any>) {
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

    const { rows } = await dbPool.query(sql, values);
    return rows[0] || null;
  }

  async delete(id: string | number) {
    const value = this.normalizeId(id);

    const sql = `
      DELETE FROM ${this.tableRef}
      WHERE ${this.idColumn} = $1
      RETURNING *;
    `;

    const { rows } = await dbPool.query(sql, [value]);
    return rows[0] || null;
  }
}
