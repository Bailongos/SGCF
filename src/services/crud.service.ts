// src/services/crud.service.ts
import { dbPool } from '../data';
import { DB_SCHEMA } from '../shared/db-schema';

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

  async getAll() {
    const sql = `SELECT * FROM ${this.tableRef}`;
    const { rows } = await dbPool.query(sql);
    return rows;
  }

  async getById(id: string | number) {
    const value = this.normalizeId(id);
    const sql = `SELECT * FROM ${this.tableRef} WHERE ${this.idColumn} = $1`;
    const { rows } = await dbPool.query(sql, [value]);
    return rows[0] || null;
  }

  async create(data: Record<string, any>) {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      throw new Error('No hay datos para insertar');
    }

    const columns = keys.join(', ');
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
      .map((k, idx) => `${k} = $${idx + 1}`)
      .join(', ');

    const values = keys.map((k) => data[k]);
    values.push(value);

    const sql = `
      UPDATE ${this.tableRef}
      SET ${setClause}
      WHERE ${this.idColumn} = $${keys.length + 1}
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
