import {
  AuthSession,
  AuthUser,
  AuthUserSession,
  MatchAuthUser,
} from '../../types';
import { H3Event } from 'h3';
import { serverAuth } from './auth';
import { matchesUser } from '../../utils/match-user';

type SessionWithHeaders = {
  headers: Headers;
  response: AuthUserSession | null;
};

type RequireSessionOptions = {
  user?: MatchAuthUser;
  rule?: (ctx: {
    user: AuthUser;
    session: AuthSession;
  }) => boolean | Promise<boolean>;
};

export async function loadSession(
  event: H3Event,
  { force }: { force?: boolean } = {},
): Promise<SessionWithHeaders> {
  const auth = serverAuth();
  const result = (await auth.api.getSession({
    headers: getRequestHeaders(event) as any,
    query: force ? { disableCookieCache: force } : undefined,
    returnHeaders: true,
  })) as unknown;

  // Keep unit-level and forward-compatible resilience if an auth adapter ignores
  // returnHeaders, while Better Auth 1.7.3+ returns SessionWithHeaders here.
  if (
    result &&
    typeof result === 'object' &&
    'headers' in result &&
    result.headers instanceof Headers &&
    'response' in result
  ) {
    return result as SessionWithHeaders;
  }

  return { headers: new Headers(), response: result as AuthUserSession | null };
}

export async function requireUserSession(
  event: H3Event,
  options?: RequireSessionOptions,
): Promise<AuthUserSession> {
  const session = await loadSession(event);
  const authSession = session.response;

  if (!authSession) {
    throw createError({
      message: 'Authentication required',
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  if (options?.user) {
    if (!matchesUser(authSession.user, options.user)) {
      throw createError({
        message: 'Access denied',
        statusCode: 403,
        statusMessage: 'Forbidden',
      });
    }
  }

  if (options?.rule) {
    const allowed = await options.rule({
      user: authSession.user,
      session: authSession.session,
    });

    if (!allowed) {
      throw createError({
        message: 'Access denied',
        statusCode: 403,
        statusMessage: 'Forbidden',
      });
    }
  }

  return authSession;
}
