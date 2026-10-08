import { join } from 'node:path';
import {
  addImports,
  addPlugin,
  addRouteMiddleware,
  addServerHandler,
  addServerImports,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  getLayerDirectories,
} from 'nuxt/kit';
import { buildRouteRuleTypeTemplate } from './runtime/templates/route-rules-template';

export type ModuleOptions = {
  redirects?: {
    /** Login page route, default '/login' */
    login?: string;
    /** Navigate user on successful logout, default no redirect */
    logout?: string;
    /** Redirect a guest user to, default '/' */
    guest?: string;
  };
  /** Preserve Redirect when redirected by auth middleware, default `true` */
  preserveRedirect?: boolean;
  /** Query key user for redirect, default 'redirect' */
  redirectQueryKey?: string;
};

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'better-auth-module',
    configKey: 'auth',
  },
  async setup(options, nuxt) {
    nuxt.hook('modules:done', async () => {
      const { resolve } = createResolver(import.meta.url);

      nuxt.options.alias['#auth'] = resolve('./runtime/virtual-import.ts');

      const layerDir = getLayerDirectories(nuxt)[0];

      const serverDir = layerDir?.server ?? resolve('../../server');
      const appDir = layerDir?.app ?? resolve('../../app');

      const serverAuthPath = join(serverDir, 'auth.config').replace(/\\/g, '/');
      const clientAuthPath = join(appDir, 'auth.config').replace(/\\/g, '/');

      nuxt.options.alias['#auth/client'] = clientAuthPath;
      nuxt.options.alias['#auth/server'] = serverAuthPath;

      const moduleOptions = normalizeOptions(options);

      (nuxt.options.runtimeConfig.public.auth as unknown) ??= {};
      nuxt.options.runtimeConfig.public.auth = {
        ...moduleOptions,
        ...nuxt.options.runtimeConfig.public.auth,
      };

      const routeRulesTypeFilePath = resolve('./runtime/types');

      const routeRulesContent = JSON.stringify(
        nuxt.options.routeRules ?? {},
        null,
        2,
      );

      nuxt.options.alias['#auth/route-rules'] = addTemplate({
        filename: 'auth/route-roules.ts',
        getContents: () =>
          [
            `export const routeRules = ${routeRulesContent}`,
            ``,
            `export type AuthRouteRules = import('${routeRulesTypeFilePath}').AuthRouteRules`,
          ].join('\n'),
        write: true,
      }).dst;

      addTypeTemplate(
        {
          filename: 'types/route-rules-auth.d.ts',
          getContents: () =>
            buildRouteRuleTypeTemplate({
              resolve,
              serverAuthPath,
            }),
        },
        {
          nitro: true,
          node: true,
          nuxt: true,
          shared: true,
        },
      );

      addPlugin({
        src: resolve('./runtime/app/plugins/session.server'),
        mode: 'server',
        name: 'auth-session.server',
      });
      addPlugin({
        src: resolve('./runtime/app/plugins/session.client'),
        mode: 'client',
        name: 'auth-session.client',
      });

      addImports([
        {
          from: resolve('./runtime/app/composables/useAuthClient'),
          name: 'useAuthClient',
        },
        {
          from: resolve('./runtime/app/composables/useUserSession'),
          name: 'useUserSession',
        },
        {
          from: resolve('./runtime/app/composables/useSignIn'),
          name: 'useSignIn',
        },
        {
          from: resolve('./runtime/app/composables/useSignUp'),
          name: 'useSignUp',
        },
      ]);

      addRouteMiddleware({
        path: resolve('./runtime/app/middleware/auth.global'),
        global: true,
        name: 'auth',
      });

      addServerImports([
        {
          from: resolve('./runtime/server/utils/auth'),
          name: 'serverAuth',
        },
        {
          from: resolve('./runtime/server/utils/session'),
          name: 'requireUserSession',
        },
      ]);

      addServerHandler({
        handler: resolve('./runtime/server/api/auth/[...all]'),
        route: '/api/auth/**',
      });
      addServerHandler({
        handler: resolve('./runtime/server/middleware/route-access'),
        middleware: true,
      });
    });
  },
});

export type ModuleOptionsNormalized = {
  redirects: {
    login: string;
    logout?: string;
    guest: string;
  };
  /** Preserve Redirect when redirected by auth middleware, default `true` */
  preserveRedirect: boolean;
  /** Query key user for redirect, default 'redirect' */
  redirectQueryKey: string;
};

function normalizeOptions(options: ModuleOptions): ModuleOptionsNormalized {
  const normalizedOptions: ModuleOptionsNormalized = {
    ...options,
    redirects: {
      login: options?.redirects?.login ?? '/login',
      logout: options?.redirects?.logout,
      guest: options?.redirects?.guest ?? '/',
    },
    redirectQueryKey: 'redirect',
    preserveRedirect: true,
  };

  return normalizedOptions;
}
