import { dbPool } from '../data';

const SCHEMA = `"control financiero"`; // o control_financiero si lo renombraste

export class AlumnosService {
  static async getAll() {
    const sql = `SELECT * FROM ${SCHEMA}.alumnos`;
    const { rows } = await dbPool.query(sql);
    return rows;
  }
}
