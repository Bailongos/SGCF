"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPool = void 0;
exports.testDbConnection = testDbConnection;
const pg_1 = require("pg");
const config_1 = require("../config");
exports.dbPool = new pg_1.Pool({
    connectionString: config_1.envs.DATABASE_URL,
});
async function testDbConnection() {
    // Simple ping
    await exports.dbPool.query('SELECT 1');
}
