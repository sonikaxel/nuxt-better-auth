import type { RawError } from 'better-auth';
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

type SignUp = AppAuthClient['signUp'];
type SignUpMethod = keyof SignUp;

type SignUpData<
  M extends SignUpMethod,
  P extends Parameters<SignUp[M]>[0],
> = ParamWithInterceptor<P, ClientAuthUser | null>;

let _signUpPromise: Promise<void> | null = null;

export const useSignUp = () => {
  const client = useAuthClient();
  const { user, session } = useUserSession();

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
        await nextTick();

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

        let redirect: string | undefined = callbackURL ?? undefined;

        const loggedInUser =
          (response.data as { user?: ClientAuthUser })?.user ?? null;

        // invoke onSuccess interceptor, if present
        if (onSuccess) {
          await onSuccess(loggedInUser);
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
