import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { register } from 'tsconfig-paths';

// Register standard tsconfig paths if needed explicitly, though ts-node usually handles it
register({
  baseUrl: './',
  paths: { '@app/entity-data-models': ['libs/entity-data-models/src'] },
});

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'gym_db',
  entities: ['libs/entity-data-models/src/**/*.entity.ts'], // Direct path to avoid aliases issues in CLI
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Migrations disable synchronize
});
