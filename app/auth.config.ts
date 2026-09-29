import { adminClient, usernameClient } from 'better-auth/client/plugins';
import type { BetterAuthClientOptions } from 'better-auth';

export default {
  plugins: [adminClient(), usernameClient()],
} as const satisfies Omit<BetterAuthClientOptions, 'baseURL' | 'basePath'>;
