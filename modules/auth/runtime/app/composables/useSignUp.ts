import type { RawError } from 'better-auth';
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

type SignUp = AppAuthClient['signUp'];
type SignUpMethod = keyof SignUp;

type SignUpData<
  M extends SignUpMethod,
  P extends Parameters<SignUp[M]>[0],
> = ParamWithInterceptor<P, ClientAuthUserSession | null>;

let _signUpPromise: Promise<void> | null = null;

export const useSignUp = () => {
  const client = useAuthClient();
  const { user, session, fetchSession } = useUserSession();
  const route = useRoute();
  const { redirectQueryKey } = useRuntimeConfig().public.auth;

  const signUpProgress = useState('auth:sign-up-in-progress', () => false);
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

  async function signUpFn<
    M extends SignUpMethod,
    P extends Parameters<SignUp[M]>[0],
  >(method: M, data: SignUpData<M, P>) {
    if (!import.meta.client)
      throw new Error('signIn can only be called on client-side');

    if (_signUpPromise) {
      await _signUpPromise;
      return;
    }

    _signUpPromise = (async () => {
      signUpProgress.value = true;

      try {
        const { callbackURL, onSuccess, onError, ...restData } = data;

        const handler = client.signUp[method] as (
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
          }
          // Throw fallback error
          throw new Error(error.message);
        }

        let redirect: string | undefined = callbackURL ?? undefined;

        // invoke onSuccess interceptor, if present
        if (onSuccess) {
          await onSuccess(userSession);
        }

        redirect && (await navigateTo(redirect));
      } finally {
        signUpProgress.value = false;
      }
    })().finally(() => {
      _signUpPromise = null;
    });

    await _signUpPromise;
  }

  const signUp = async <
    M extends SignUpMethod,
    P extends Parameters<SignUp[M]>[0],
  >(
    method: M,
    data: SignUpData<M, P>,
  ) => {
    try {
      error.value = undefined;
      loading.value = true;
      await signUpFn<M, P>(method, data);
    } catch (e) {
      const _error = normalizeAuthActionError(e);
      error.value = _error;
    } finally {
      loading.value = false;
    }
  };

  return {
    signUp,
    data,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
  };
};
