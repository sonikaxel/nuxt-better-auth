import type { AuthActionError } from '../utils/auth-action-error';

export type Interceptor<T = unknown> = {
  onSuccess?: (data: T) => any;
  onError?: (error: AuthActionError) => any;
};

export type ParamWithInterceptor<P, T = unknown> = P & Interceptor<T>;
