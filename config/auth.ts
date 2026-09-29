import { betterAuth } from 'better-auth';
import { admin, username } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../server/utils/db/schema';
import { v7 as uuidv7 } from 'uuid';

const db = drizzle(process.env.NUXT_DATABASE_URL!);
const database = drizzleAdapter(db, {
  provider: 'pg',
  schema,
});

export const auth = betterAuth({
  baseURL: 'http://localhost:3000',
  database,
  plugins: [admin(), username({ displayUsername: false })],
  secret: process.env.NUXT_BETTER_AUTH_SECRET!,
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
});
