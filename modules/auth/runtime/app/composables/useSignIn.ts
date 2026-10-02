import type { BetterAuthError, RawError } from 'better-auth';
import type { AppAuthClient, ClientAuthUserSession } from '../../types';

type Interceptor<T = unknown> = {
  onSuccess?: (data: T, redirecting?: boolean) => any;
  onError?: (error: Partial<BetterAuthError>) => any;
};

type ParamWithInterceptor<P, T = unknown> = P & Interceptor<T>;

export const useSignIn = () => {
  const client = useAuthClient();
  const { user, session, fetchSession } = useUserSession();
  const route = useRoute();
  const { redirectQueryKey } = useRuntimeConfig().public.auth;

  type SignIn = AppAuthClient['signIn'];
  type LoginMethod = keyof SignIn;

  return async function signIn<
    M extends LoginMethod,
    P extends Parameters<SignIn[M]>[0],
  >(method: M, data: ParamWithInterceptor<P, ClientAuthUserSession>) {
    if (!import.meta.client)
      throw new Error('signIn can only be called on client-side');

    const { callbackURL, onSuccess, onError, ...restData } = data;

    const handler = client!.signIn[method] as (
      req: Record<string, unknown>,
    ) => Promise<{
      data: any;
      error: Partial<RawError> | null;
    }>;

    const response = await handler(restData);

    await fetchSession({ force: true });
    await nextTick();

    const userSession =
      (user.value &&
        session.value && {
          user: user.value,
          session: session.value,
        }) ||
      null;

    if (onError && response.error) {
      await onError(response.error);
      return;
    }

    const redirect = route.query[redirectQueryKey];

    if (onSuccess && !response.error && userSession) {
      const redirecting =
        (typeof redirect === 'string' && !!redirect) || !!callbackURL;
      await onSuccess(userSession, redirecting);
    }

    if (userSession && callbackURL) {
      await navigateTo(callbackURL);
      return;
    }

    if (userSession && typeof redirect === 'string' && redirect) {
      await navigateTo(redirect);
      return;
    }
  };
};
