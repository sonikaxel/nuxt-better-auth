import { defineEventHandler, getRequestURL, useRuntimeConfig } from '#imports';
import {
  normalizeAuthRoutePath,
  shouldSkipAuthRouteRules,
} from '../../internal/auth-route-rules';
import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types';
import { matchesUser } from '../../utils/match-user';
import { loadSession, requireUserSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  const path = normalizeAuthRoutePath(
    getRequestURL(event).pathname,
    useRuntimeConfig().app?.baseURL,
  );

  if (path !== '/api' && !path.startsWith('/api/')) return;

  if (shouldSkipAuthRouteRules(path)) return;

  const rules = getRouteRules(event) as AuthRouteRules;

  if (!rules.auth) return;

  const auth: AuthMeta = rules.auth;
  const mode: AuthMode =
    typeof auth === 'string' ? auth : (auth?.only ?? 'user');

  if (mode === 'guest') {
    const { response } = await loadSession(event);
    const session = response?.session;

    if (session) {
      throw createError({
        message: 'Authenticated users not allowed',
        statusCode: 403,
        statusMessage: 'Forbidden',
      });
    }

    return;
  }

  if (mode === 'user') {
    const session = await requireUserSession(event);

    if (typeof auth === 'object' && auth.user) {
      if (!matchesUser(session.user, auth.user)) {
        throw createError({
          message: 'Access denied',
          statusCode: 403,
          statusMessage: 'Forbidden',
        });
      }
    }
  }
});
