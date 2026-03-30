"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const data_1 = require("./data");
const server_1 = require("./presentation/server");
(async () => {
    try {
        // Verificar conexión con la BD antes de levantar el server
        await (0, data_1.testDbConnection)();
        const server = new server_1.Server({
            port: config_1.envs.PORT,
        });
        await server.start();
    }
    catch (error) {
        console.error('Error al iniciar SGCF:', error);
        process.exit(1);
    }
})();
