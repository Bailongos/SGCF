import 'dotenv/config';
import { get } from 'env-var';

export const envs = {
  PORT: get('PORT').default('3000').asPortNumber(),
  NODE_ENV: get('NODE_ENV').default('development').asString(),
  DATABASE_URL: get('DATABASE_URL').required().asString(),
  JWT_SECRET: get('JWT_SECRET').default('uadec-sgcf-secret-key-2024').asString(),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: get('GOOGLE_CLIENT_ID').default('').asString(),
  GOOGLE_CLIENT_SECRET: get('GOOGLE_CLIENT_SECRET').default('').asString(),
  MICROSOFT_CLIENT_ID: get('MICROSOFT_CLIENT_ID').default('').asString(),
  MICROSOFT_CLIENT_SECRET: get('MICROSOFT_CLIENT_SECRET').default('').asString(),
  MICROSOFT_TENANT_ID: get('MICROSOFT_TENANT_ID').default('common').asString(),
};
