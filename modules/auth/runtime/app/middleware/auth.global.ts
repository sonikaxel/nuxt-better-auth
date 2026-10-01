import { getRouteRules } from '#imports';
import defu from 'defu';
import { createRouter, toRouteMatcher } from 'radix3';
import { withoutBase } from 'ufo';
import type { ModuleOptionsNormalized } from '../../../';
import { shouldSkipAuthRouteRules } from '../../internal/auth-route-rules';
import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types';
import { matchesUser } from '../../utils/match-user';

declare module '#app' {
  interface PageMeta {
    auth?: AuthMeta;
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: AuthMeta;
  }
}

let authRouteRulesPromise: Promise<Record<string, AuthRouteRules>> | null =
  null;
let routeRulesMatcherPromise: Promise<ReturnType<
  typeof toRouteMatcher
> | null> | null = null;

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Nuxt App
  const nuxtApp = useNuxtApp();
  // Runtime config
  const runtimeConfig = useRuntimeConfig();

  const config = runtimeConfig.public.auth as
    | ModuleOptionsNormalized
    | undefined;

  to.path = withoutBase(to.path, runtimeConfig.app.baseURL);

  if (shouldSkipAuthRouteRules(to.path)) return;

  // Skip if there are no matched routes
  if (!to.matched?.length) return;

  // Runtime fallback: resolve auth from module-known route rules if not set at build-time.
  // This covers dynamic/404 paths where build-time page matching is not enough.
  if (to.meta.auth === undefined) {
    const routeRulesMatcher = await getRouteRulesMatcher();
    const matches = routeRulesMatcher?.matchAll(to.path) as
      | Partial<AuthRouteRules>[]
      | undefined;

    if (matches?.length) {
      const merged = defu({}, ...matches.reverse()) as AuthRouteRules;
      if (merged.auth !== undefined) {
        to.meta.auth = merged.auth;
      }
    }
    if (to.meta.auth === undefined) {
      const rules = (await getRouteRules({ path: to.path })) as AuthRouteRules;
      if (rules.auth !== undefined) {
        to.meta.auth = rules.auth;
      }
    }
  }

  const auth = to.meta.auth as AuthMeta | undefined;

  // Do nothing if auth is not defined or is false
  if (!auth) return;

  // Fetch or retrieve your actual session/user state
  const { loggedIn, user, fetchSession } = useUserSession();

  const mode: AuthMode =
    typeof auth === 'string' ? auth : (auth?.only ?? 'user');
  const redirectTo = typeof auth === 'object' ? auth.redirectTo : undefined;

  // 1. Fetch Session.
  if (!loggedIn.value || mode === 'guest') {
    // Header if on server
    const headers = import.meta.server
      ? useRequestHeaders(['cookie'])
      : undefined;

    // For disabling cookieCache (force fetch session)
    const isHydratedPrerenderPayload =
      (import.meta.client || !import.meta.server) &&
      nuxtApp.isHydrating &&
      Boolean(nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached);

    await fetchSession({
      headers,
      ...(isHydratedPrerenderPayload ? { force: true } : {}),
    });
  }

  // 2. Guest can stay on route if not logged-in.
  if (mode === 'guest') {
    if (loggedIn.value) {
      return navigateTo(redirectTo ?? config?.redirects?.guest ?? '/');
    }
    return;
  }

  // 3. Redirect user if not logged-in
  if (!loggedIn.value) {
    const resolved = resolveLoginRedirect({
      route: to,
      loginTarget: redirectTo ?? config?.redirects?.login ?? '/login',
      config,
      baseURL: runtimeConfig.app.baseURL,
    });
    return resolved?.external
      ? navigateTo(resolved.to, { external: true })
      : navigateTo(resolved.to);
  }

  // 4. Matches logged-in user
  if (typeof auth === 'object' && auth.user) {
    if (!user.value || !matchesUser(user.value, auth.user))
      throw createError({ statusCode: 403, statusMessage: 'Access denied' });
  }
});

function resolveLoginRedirect(input: {
  route: { fullPath: string };
  loginTarget: string;
  config?: Pick<
    ModuleOptionsNormalized,
    'preserveRedirect' | 'redirectQueryKey'
  >;
  baseURL: string;
}): { to: Parameters<typeof navigateTo>[0]; external: boolean } {
  const { route, loginTarget, config, baseURL } = input;

  const preserveRedirect = config?.preserveRedirect ?? true;
  const redirectQueryKey = config?.redirectQueryKey ?? 'redirect';

  if (!preserveRedirect) return { to: loginTarget, external: false };

  // Only append for internal app routes: a single-leading-slash path.
  // Avoid protocol-relative/external URLs and avoid munging non-path targets.
  if (!loginTarget.startsWith('/') || loginTarget.startsWith('//'))
    return { to: loginTarget, external: false };

  const [beforeHash, hash = ''] = loginTarget.split('#', 2);

  if (!beforeHash) return { to: loginTarget, external: false };

  const [path, query = ''] = beforeHash.split('?', 2);

  try {
    const params = new URLSearchParams(query);

    if (params.has(redirectQueryKey)) {
      return { to: loginTarget, external: false };
    }
  } catch {
    return { to: loginTarget, external: false };
  }

  // Server: use an external redirect so the Location header keeps the encoded value.
  if (import.meta.server) {
    const separator = query ? '&' : '';
    const encodedRedirect = encodeURIComponent(route.fullPath);
    const url = `${path}?${query}${separator}${redirectQueryKey}=${encodedRedirect}${hash ? `#${hash}` : ''}`;
    return { to: url, external: true };
  }

  // Client: return a route location object to avoid a full reload.
  const params = new URLSearchParams(query);
  const queryObj: Record<string, string> = {};
  for (const [k, v] of params.entries()) queryObj[k] = v;
  queryObj[redirectQueryKey] = route.fullPath;

  return {
    to: { path, query: queryObj, ...(hash ? { hash: `#${hash}` } : {}) },
    external: false,
  };
}

async function getAuthRouteRules(): Promise<Record<string, AuthRouteRules>> {
  if (!authRouteRulesPromise) {
    authRouteRulesPromise = import('#auth/route-rules')
      .then(
        (mod) =>
          (mod as { routeRules?: Record<string, AuthRouteRules> }).routeRules ||
          {},
      )
      .catch(() => ({}));
  }
  return await authRouteRulesPromise;
}

async function getRouteRulesMatcher(): Promise<ReturnType<
  typeof toRouteMatcher
> | null> {
  if (!routeRulesMatcherPromise) {
    routeRulesMatcherPromise = getAuthRouteRules().then((authRouteRules) => {
      if (!Object.keys(authRouteRules).length) return null;
      return toRouteMatcher(
        createRouter({
          routes: authRouteRules as Record<string, AuthRouteRules>,
        }),
      );
    });
  }
  return await routeRulesMatcherPromise;
}
