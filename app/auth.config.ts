import { adminClient, usernameClient } from 'better-auth/client/plugins';
import type { BetterAuthClientOptions } from 'better-auth';
import { roles, ac } from '../shared/auth/access';

export default {
  plugins: [adminClient({ ac, roles }), usernameClient()],
} satisfies Omit<BetterAuthClientOptions, 'baseURL' | 'basePath'>;
