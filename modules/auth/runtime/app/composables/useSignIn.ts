import type { BetterAuthError, RawError } from 'better-auth';
import type { AppAuthClient, ClientAuthUserSession } from '../../types';
import {
  normalizeAuthActionError,
  type AuthActionError,
} from '../../utils/auth-action-error';

type Interceptor<T = unknown> = {
  onSuccess?: (data: T) => any;
  onError?: (error: AuthActionError) => any;
};

type ParamWithInterceptor<P, T = unknown> = P & Interceptor<T>;

let _signInPromise: Promise<void> | null = null;

export const useSignIn = () => {
  const client = useAuthClient();
  const { user, session, fetchSession } = useUserSession();
  const route = useRoute();
  const { redirectQueryKey } = useRuntimeConfig().public.auth;

  const signInProgress = useState('auth:sign-in-progress', () => false);

  type SignIn = AppAuthClient['signIn'];
  type LoginMethod = keyof SignIn;

  return async function signIn<
    M extends LoginMethod,
    P extends Parameters<SignIn[M]>[0],
  >(method: M, data: ParamWithInterceptor<P, ClientAuthUserSession>) {
    if (!import.meta.client)
      throw new Error('signIn can only be called on client-side');

    if (_signInPromise) {
      await _signInPromise;
      return;
    }

    _signInPromise = (async () => {
      signInProgress.value = true;

      try {
        const { callbackURL, onSuccess, onError, ...restData } = data;

        const handler = client!.signIn[method] as (
          req: Record<string, unknown>,
        ) => Promise<{
          data: any;
          error: Partial<RawError> | null;
        }>;

        // Invoke sign-in
        const response = await handler(restData);

        // Fetch Session after sign-in
        await fetchSession({ force: true });
        await nextTick();

        // User Session, null if no user or session
        const userSession =
          (user.value &&
            session.value && {
              user: user.value,
              session: session.value,
            }) ||
          null;

        // Error handling
        if (response.error || !userSession) {
          // Normalized error
          const error = normalizeAuthActionError(response.error);

          // prioritize onError interseptor
          if (onError) {
            await onError(error);
            return;
          }
          // Throw fallback error
          throw new Error(error.message);
        }

        const redirectQuery = route.query[redirectQueryKey];
        let redirect: string | undefined = undefined;

        // Set redirect if callbackURL or redirectQuery is present
        if (typeof redirectQuery === 'string' && redirectQuery) {
          redirect = redirectQuery;
        } else if (callbackURL) {
          redirect = callbackURL;
        }

        // invoke onSuccess interceptor, if present
        if (onSuccess) {
          await onSuccess(userSession);
        }

        redirect && (await navigateTo(redirect));
      } finally {
        signInProgress.value = false;
      }
    })().finally(() => {
      _signInPromise = null;
    });

    await _signInPromise;
  };
};
