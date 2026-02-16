import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { register } from 'tsconfig-paths';

// Register standard tsconfig paths if needed explicitly, though ts-node usually handles it
register({
  baseUrl: './',
  paths: { '@app/entity-data-models': ['libs/entity-data-models/src'] },
});

config();

const isProduction = process.env.NODE_ENV === 'production';
const useSsl =
  (process.env.DATABASE_SSL || (isProduction ? 'true' : 'false')) === 'true';

export default new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'gym_db',
      }),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: ['libs/entity-data-models/src/**/*.entity.ts'], // Direct path to avoid aliases issues in CLI
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Migrations disable synchronize
});
