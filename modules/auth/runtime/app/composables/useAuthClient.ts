import authClientConfig from '@/auth.config';
import type { BetterAuthClientOptions } from 'better-auth';
import { createAuthClient } from 'better-auth/vue';
import type { AppAuthClient } from '../../types';

let authClient: AppAuthClient | undefined = undefined;

export const useAuthClient = () => {
  if (!authClient) {
    const { basePath, baseURL, ...options } =
      authClientConfig as typeof authClientConfig & {
        basePath?: string;
        baseURL?: string;
      };
    authClient = createAuthClient({
      baseURL: useRequestURL().origin,
      ...options,
    } satisfies BetterAuthClientOptions);
  }

  return authClient;
};
