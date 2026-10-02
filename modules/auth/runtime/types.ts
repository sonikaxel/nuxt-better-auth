import authClientConfig from '#auth/client';
import authServerConfig from '#auth/server';
import type { Auth } from 'better-auth';
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

/** Client Auth User Session */
export type ClientAuthUserSession = {
  user: ClientAuthUser;
  session: ClientAuthSession;
};

/** Auth Mode */
export type AuthMode = 'guest' | 'user';

type User = Omit<AuthUser, 'createdAt' | 'updatedAt' | 'banExpires'>;

/** User to match */
export type MatchAuthUser = UserMatch<User>;

/** Auth Meta */
export type AuthMeta =
  | false
  | AuthMode
  | {
      only?: AuthMode;
      user?: MatchAuthUser;
      redirectTo?: string;
    };

/** Auth Route Rules */
export type AuthRouteRules = Record<string, unknown> & { auth?: AuthMeta };

type UpdateUserFn = AppAuthClient['updateUser'];

export type AuthUserUpdateInput = Parameters<UpdateUserFn>[0];
