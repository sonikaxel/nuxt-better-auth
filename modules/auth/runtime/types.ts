import authClientConfig from '#auth/client';
import authServerConfig from '#auth/server';
import type { Auth, BetterAuthOptions } from 'better-auth';
import type { VueAuthClient } from 'better-auth/vue';
import type { UserMatch } from './utils/match-user';

/** Auth Client */
export type AppAuthClient = VueAuthClient<typeof authClientConfig>;

// Server Auth
export type AppAuthServer = Auth<typeof authServerConfig>;

/** Auth Session (Server) */
export type AuthUserSession = AppAuthServer['$Infer']['Session'];

/** Auth User (Server) */
export type AuthUser = AuthUserSession['user'];

/** Auth Session with token */
export type AuthSession = AuthUserSession['session'];

/** Client Auth Session */
export type ClientAuthSession = Omit<AuthSession, 'token'>;

/** Client Auth User */
export type ClientAuthUser = AuthUser;

export type AuthMode = 'guest' | 'user';

type User = Omit<AuthUser, 'createdAt' | 'updatedAt' | 'banExpires'>;

export type MatchAuthUser = UserMatch<User>;

export type AuthMeta =
  | false
  | AuthMode
  | {
      only?: AuthMode;
      user?: MatchAuthUser;
      redirectTo?: string;
    };

export type AuthRouteRules = Record<string, unknown> & { auth?: AuthMeta };
