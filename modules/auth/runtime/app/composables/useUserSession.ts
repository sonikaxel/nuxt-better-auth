import {
  computed,
  navigateTo,
  nextTick,
  useNuxtApp,
  useRuntimeConfig,
  useState,
  watch,
} from '#imports';
import type {
  AppAuthClient,
  ClientAuthSession,
  ClientAuthUser,
} from '../../types';
import {
  isRecord,
  normalizeAuthActionError,
} from '../../utils/auth-action-error';
import {
  fetchSessionClient,
  fetchSessionServer,
  isExpectedSignedOutSessionError,
  stripToken,
} from '../../utils/session-fetch';
import { useAuthClient } from './useAuthClient';

export interface SignOutOptions {
  onSuccess?: () => void | Promise<void>;
}

type HasPermissionParam = Parameters<
  AppAuthClient['admin']['hasPermission']
>[0];
type AuthPermissions = HasPermissionParam['permissions'];

let _signOutPromise: Promise<void> | null = null;
const _sessionSyncApps = new WeakSet<object>();

export function useUserSession() {
  const authClient = useAuthClient();

  const runtimeFlags = {
    server: import.meta.server,
    client: import.meta.client,
  };
  const runtimeConfig = useRuntimeConfig();
  const nuxtApp = useNuxtApp();
  const rawClient = authClient;

  // Shared state via useState for SSR hydration
  const session = useState<ClientAuthSession | null>(
    'auth:session',
    () => null,
  );
  const user = useState<ClientAuthUser | null>('auth:user', () => null);
  const authReady = useState('auth:ready', () => false);
  const prerenderReadyResetQueued = useState(
    'auth:prerender-ready-reset-queued',
    () => false,
  );
  const hydrationReconcileQueued = useState(
    'auth:hydration-reconcile-queued',
    () => false,
  );
  const signOutInProgress = useState('auth:sign-out-in-progress', () => false);
  const ready = computed(() => authReady.value);
  const loggedIn = computed(() => Boolean(session.value && user.value));
  const isPrerenderedPayload = computed(() =>
    Boolean(nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached),
  );
  const isPrerenderHydrationEmptySnapshot = computed(() => {
    if (!runtimeFlags.client) return false;
    if (
      !nuxtApp.isHydrating ||
      !nuxtApp.payload.serverRendered ||
      !isPrerenderedPayload.value
    )
      return false;
    return !session.value && !user.value;
  });

  if (
    isPrerenderHydrationEmptySnapshot.value &&
    authReady.value &&
    !prerenderReadyResetQueued.value
  ) {
    prerenderReadyResetQueued.value = true;
    nuxtApp.hook('app:suspense:resolve', () => {
      try {
        if (!session.value && !user.value && authReady.value)
          authReady.value = false;
      } finally {
        prerenderReadyResetQueued.value = false;
      }
    });
  }

  function clearSession() {
    session.value = null;
    user.value = null;
  }

  async function fetchSession(
    options: { headers?: HeadersInit; force?: boolean } = {},
  ) {
    if (runtimeFlags.server)
      return fetchSessionServer(session, user, authReady, options);
    if (rawClient)
      return fetchSessionClient(rawClient, session, user, authReady, options);
  }

  let mountedReconciliationStarted = false;
  let sessionExpiredRedirecting = false;

  function getSessionExpiredRedirect(): string | undefined {
    return (
      runtimeConfig.public.auth as
        | { redirects?: { sessionExpired?: string } }
        | undefined
    )?.redirects?.sessionExpired;
  }

  function scheduleSessionExpiredRedirect() {
    const sessionExpiredRedirect = getSessionExpiredRedirect();
    if (
      !sessionExpiredRedirect ||
      signOutInProgress.value ||
      sessionExpiredRedirecting
    )
      return;

    sessionExpiredRedirecting = true;
    void nextTick().then(() => {
      if (sessionExpiredRedirecting) void navigateTo(sessionExpiredRedirect);
    });
  }

  function queueHydrationReconciliation() {
    if (hydrationReconcileQueued.value) return;

    hydrationReconcileQueued.value = true;
    const reconcile = async () => {
      const sessionWasActive = loggedIn.value;
      try {
        await fetchSession({ force: true });
        if (sessionWasActive && !loggedIn.value)
          scheduleSessionExpiredRedirect();
      } catch (error) {
        console.error(
          '[nuxt-better-auth] Failed to fetch session during hydration reconciliation:',
          error,
        );
      } finally {
        hydrationReconcileQueued.value = false;
      }
    };

    if (mountedReconciliationStarted) {
      void reconcile();
    } else {
      nuxtApp.hook('app:mounted', () => {
        mountedReconciliationStarted = true;
        return reconcile();
      });
    }
  }

  // On client, subscribe to better-auth's reactive session store
  if (runtimeFlags.client && rawClient && !_sessionSyncApps.has(nuxtApp)) {
    const clientSession = rawClient.useSession();
    const initialClientSession = clientSession.value;
    let hydrationSessionWasActive =
      nuxtApp.isHydrating &&
      nuxtApp.payload.serverRendered &&
      Boolean(session.value && user.value) &&
      !initialClientSession?.data?.session &&
      !initialClientSession?.data?.user;

    const shouldReconcileInitialHydration =
      nuxtApp.isHydrating &&
      nuxtApp.payload.serverRendered &&
      Boolean(session.value && user.value) &&
      !initialClientSession?.data?.session &&
      !initialClientSession?.data?.user &&
      !initialClientSession?.isPending &&
      !initialClientSession?.isRefetching;

    if (shouldReconcileInitialHydration) queueHydrationReconciliation();

    watch(
      () => clientSession.value,
      (newSession, previousSession) => {
        const shouldWaitForPrerenderResolution =
          isPrerenderHydrationEmptySnapshot.value &&
          !newSession?.data?.session &&
          !newSession?.data?.user;

        if (shouldWaitForPrerenderResolution) return;

        if (newSession?.data?.session && newSession?.data?.user) {
          sessionExpiredRedirecting = false;
          hydrationSessionWasActive = false;
          session.value = stripToken(
            newSession.data.session as ClientAuthSession & { token?: string },
          );
          user.value = newSession.data.user as ClientAuthUser;
        } else if (!newSession?.isPending && !newSession?.isRefetching) {
          const isHydrationEmptySnapshot =
            nuxtApp.isHydrating &&
            nuxtApp.payload.serverRendered &&
            Boolean(session.value && user.value) &&
            !newSession?.data?.session &&
            !newSession?.data?.user;

          if (isHydrationEmptySnapshot) {
            queueHydrationReconciliation();
            return;
          }

          const sessionWasActive =
            hydrationSessionWasActive ||
            Boolean(
              previousSession?.data?.session && previousSession?.data?.user,
            );
          const sessionWasInvalidated =
            !newSession?.error ||
            isExpectedSignedOutSessionError(newSession.error);

          if (sessionWasInvalidated) {
            hydrationSessionWasActive = false;
            clearSession();
          }

          if (sessionWasActive && sessionWasInvalidated)
            scheduleSessionExpiredRedirect();
        }
        if (
          !authReady.value &&
          !newSession?.isPending &&
          !newSession?.isRefetching
        )
          authReady.value = true;
      },
    );

    _sessionSyncApps.add(nuxtApp);
  }

  function waitForSession(): Promise<void> {
    return new Promise((resolve) => {
      if (loggedIn.value) {
        resolve();
        return;
      }
      const unwatch = watch(loggedIn, (isLoggedIn) => {
        if (isLoggedIn) {
          unwatch();
          resolve();
        }
      });
      setTimeout(() => {
        unwatch();
        resolve();
      }, 5000);
    });
  }

  async function signOut(options?: SignOutOptions) {
    if (!import.meta.client)
      throw new Error('signOut can only be called on client-side');

    if (_signOutPromise) {
      await _signOutPromise;
      return;
    }

    _signOutPromise = (async () => {
      signOutInProgress.value = true;
      try {
        const result = await rawClient.signOut();
        if (isRecord(result) && result.error)
          throw new Error(normalizeAuthActionError(result.error).message);
        clearSession();

        if (options?.onSuccess) {
          await options.onSuccess();
          return;
        }

        const authConfig = runtimeConfig.public.auth as
          | { redirects?: { logout?: string } }
          | undefined;
        const logoutRedirect = authConfig?.redirects?.logout;
        if (logoutRedirect) {
          await nextTick();
          await navigateTo(logoutRedirect);
        }
      } finally {
        signOutInProgress.value = false;
      }
    })().finally(() => {
      _signOutPromise = null;
    });

    await _signOutPromise;
  }

  return {
    session,
    user,
    loggedIn,
    ready,
    signOut,
    waitForSession,
    fetchSession,
    client: authClient,
  };
}
