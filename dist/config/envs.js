"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envs = void 0;
require("dotenv/config");
const env_var_1 = require("env-var");
exports.envs = {
    PORT: (0, env_var_1.get)('PORT').default('3000').asPortNumber(),
    NODE_ENV: (0, env_var_1.get)('NODE_ENV').default('development').asString(),
    DATABASE_URL: (0, env_var_1.get)('DATABASE_URL').required().asString(),
    JWT_SECRET: (0, env_var_1.get)('JWT_SECRET').default('uadec-sgcf-secret-key-2024').asString(),
    // OAuth Providers
    GOOGLE_CLIENT_ID: (0, env_var_1.get)('GOOGLE_CLIENT_ID').default('').asString(),
    GOOGLE_CLIENT_SECRET: (0, env_var_1.get)('GOOGLE_CLIENT_SECRET').default('').asString(),
    MICROSOFT_CLIENT_ID: (0, env_var_1.get)('MICROSOFT_CLIENT_ID').default('').asString(),
    MICROSOFT_CLIENT_SECRET: (0, env_var_1.get)('MICROSOFT_CLIENT_SECRET').default('').asString(),
    MICROSOFT_TENANT_ID: (0, env_var_1.get)('MICROSOFT_TENANT_ID').default('common').asString(),
};
