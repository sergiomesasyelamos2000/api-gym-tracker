// environments/environment.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env explícitamente
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const databaseUrl = process.env.DATABASE_URL || '';
const databaseUser =
  process.env.DATABASE_USER || (databaseUrl ? '' : getRequiredEnv('DATABASE_USER'));
const databasePassword =
  process.env.DATABASE_PASSWORD ||
  (databaseUrl ? '' : getRequiredEnv('DATABASE_PASSWORD'));
const databaseName =
  process.env.DATABASE_NAME || (databaseUrl ? '' : getRequiredEnv('DATABASE_NAME'));

export const ENV = {
  // API Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  LOGMEAL_API_KEY: process.env.LOGMEAL_API_KEY || '',
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  // JWT
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '7d',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || '',

  // Database
  DATABASE_URL: databaseUrl,
  DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
  DATABASE_PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
  DATABASE_USER: databaseUser,
  DATABASE_PASSWORD: databasePassword,
  DATABASE_NAME: databaseName,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
};
