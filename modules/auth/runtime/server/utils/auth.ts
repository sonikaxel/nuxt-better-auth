import authServerConfig from '#auth/server';
import { betterAuth } from 'better-auth';
import { AppAuthServer } from '../../types';

let auth: AppAuthServer | undefined = undefined;

export const serverAuth = () => {
  const { basePath, ...options } =
    authServerConfig as typeof authServerConfig & { basePath?: string };
  if (!auth) {
    auth = betterAuth(options);
  }

  return auth;
};
