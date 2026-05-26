// Force reload of .env variables - compiler fixes and error refactoring applied
import 'dotenv/config';
import { get } from 'env-var';

const isProduction = get('NODE_ENV').default('development').asString() === 'production';

export const envs = {
  PORT: get('PORT').default('3000').asPortNumber(),
  NODE_ENV: get('NODE_ENV').default('development').asString(),
  DATABASE_URL: get('DATABASE_URL').required().asString(),
  FRONTEND_URL: get('FRONTEND_URL').default('http://localhost:5173').asString(),
  JWT_SECRET: isProduction 
    ? get('JWT_SECRET').required().asString() 
    : get('JWT_SECRET').default('uadec-sgcf-secret-key-2024').asString(),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: get('GOOGLE_CLIENT_ID').default('').asString(),
  GOOGLE_CLIENT_SECRET: get('GOOGLE_CLIENT_SECRET').default('').asString(),
  MICROSOFT_CLIENT_ID: get('MICROSOFT_CLIENT_ID').default('').asString(),
  MICROSOFT_CLIENT_SECRET: get('MICROSOFT_CLIENT_SECRET').default('').asString(),
  MICROSOFT_TENANT_ID: get('MICROSOFT_TENANT_ID').default('common').asString(),
};
