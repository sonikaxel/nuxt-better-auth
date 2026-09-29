import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const dbPool = new Pool({
  connectionString: useRuntimeConfig().databaseUrl,
  max: 20,
});

const db = drizzle({
  client: dbPool,
  casing: 'snake_case',
  schema,
});

export const useDb = () => db;
