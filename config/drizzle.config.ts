import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    // @ts-ignore
    url: process.env.NUXT_DATABASE_URL!,
  },
  // File will be executed by terminal from root dir
  // So schema and migration should be reference from root dir
  schema: './server/utils/db/schemas/*',
  out: './.data/drizzle',
});
