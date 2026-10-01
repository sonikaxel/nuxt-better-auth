import authServerConfig from '#auth/server';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { AppAuthServer } from '../../types';
import { getAPIBasePath } from '../../utils/path';

let auth: AppAuthServer | undefined = undefined;

export const serverAuth = () => {
  if (!auth) {
    const { basePath, ...options } =
      authServerConfig as typeof authServerConfig & { basePath?: string };

    auth = betterAuth({
      basePath: getAPIBasePath(),
      ...options,
    } satisfies BetterAuthOptions) as unknown as AppAuthServer;
  }

  return auth;
};
