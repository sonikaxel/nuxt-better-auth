import { type RawError } from 'better-auth';
import type {
  AppAuthClient,
  ClientAuthUser,
  ClientAuthUserSession,
} from '../../types';
import {
  normalizeAuthActionError,
  type AuthActionError,
} from '../../utils/auth-action-error';
import type { ParamWithInterceptor } from '../types';

type SignIn = AppAuthClient['signIn'];
type SignInMethod = keyof SignIn;

type SignInData<
  M extends SignInMethod,
  P extends Parameters<SignIn[M]>[0],
> = ParamWithInterceptor<P, ClientAuthUser | null>;

let _signInPromise: Promise<void> | null = null;

export const useSignIn = () => {
  const client = useAuthClient();
  const { user, session } = useUserSession();
  const route = useRoute();
  const { redirectQueryKey } = useRuntimeConfig().public.auth;

  const signInProgress = useState('auth:sign-in-progress', () => false);
  const loading = shallowRef(false);
  const error = shallowRef<AuthActionError>();
  const data = computed<ClientAuthUserSession | null>(() =>
    user.value && session.value
      ? {
          user: user.value,
          session: session.value,
        }
      : null,
  );

  async function signInFn<
    M extends SignInMethod,
    P extends Parameters<SignIn[M]>[0],
  >(method: M, data: SignInData<M, P>) {
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
        if (response.error) {
          // Normalized error
          const error = normalizeAuthActionError(response.error);

          // prioritize onError interseptor
          if (onError) {
            await onError(error);
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

        const loggedInUser =
          (response.data as { user?: ClientAuthUser })?.user ?? null;

        // invoke onSuccess interceptor, if present
        if (onSuccess) {
          await onSuccess(loggedInUser);
        }

        redirect && (await navigateTo(redirect));
      } finally {
        signInProgress.value = false;
      }
    })().finally(() => {
      _signInPromise = null;
    });

    await _signInPromise;
  }

  const signIn = async <
    M extends SignInMethod,
    P extends Parameters<SignIn[M]>[0],
  >(
    method: M,
    data: SignInData<M, P>,
  ) => {
    try {
      error.value = undefined;
      loading.value = true;
      await signInFn<M, P>(method, data);
    } catch (e) {
      const _error = normalizeAuthActionError(e);
      error.value = _error;
    } finally {
      loading.value = false;
    }
  };

  return {
    signIn,
    data,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
  };
};
