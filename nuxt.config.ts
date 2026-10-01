// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    betterAuthSecret: '',
    databaseUrl: '',
  },
  auth: {
    redirects: {
      login: '/login',
      logout: '/login',
    },
  },
  routeRules: {
    '/register': { auth: { only: 'guest' } },
    '/login': { auth: { only: 'guest' } },
    '/logout': { auth: { only: 'user', redirectTo: '/login' } },
    '/admin/**': {
      ssr: false,
      auth: {
        only: 'user',
        user: { role: 'admin' },
      },
    },
  },
});
