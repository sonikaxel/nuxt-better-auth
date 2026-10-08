import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin, username } from 'better-auth/plugins';
import { v7 as uuidv7 } from 'uuid';
import type { BetterAuthOptions } from 'better-auth';
import { roles, ac } from '../shared/auth/access';

export default {
  appName: 'better-auth', // Your App Name
  baseURL: { allowedHosts: ['http://localhost:3000'] },
  plugins: [admin({ ac, roles }), username({ displayUsername: false })],
  secret: useRuntimeConfig().betterAuthSecret,
  database: drizzleAdapter(useDb(), {
    provider: 'pg',
  }),
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
    cookiePrefix: 'auth', // Prefix of session cookie
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 24,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
} satisfies Omit<BetterAuthOptions, 'basePath'>;
