import {
  defineNuxtPlugin,
  useRequestEvent,
  useRequestFetch,
  useState,
} from '#imports';
import { parseJSON } from 'better-auth/client';
import type { ClientAuthSession, ClientAuthUser } from '../../types';
import { appendSetCookieHeaders } from '../../utils/cookie-headers';
import { getAPISessionPath } from '../../utils/path';

export default defineNuxtPlugin({
  name: 'auth:session-init',
  enforce: 'pre',
  async setup() {
    const session = useState<ClientAuthSession | null>(
      'auth:session',
      () => null,
    );
    const user = useState<ClientAuthUser | null>('auth:user', () => null);
    const authReady = useState('auth:ready', () => false);

    // Keep auth in Nitro: importing it into the renderer duplicates config state.
    // Forward refreshed cookies from the internal response to the outer request.
    const event = useRequestEvent();
    if (event) {
      try {
        const sessionApiPath = getAPISessionPath();
        const data = await useRequestFetch()<{
          session: ClientAuthSession & { token?: string };
          user: ClientAuthUser;
        } | null>(sessionApiPath, {
          parseResponse: parseJSON,
          onResponse({ response }) {
            appendSetCookieHeaders(event, response.headers);
          },
        });
        if (data?.session && data?.user) {
          // Filter out sensitive token field from client state
          const { token: _, ...safeSession } = data.session;
          session.value = safeSession;
          user.value = data.user;
        }
      } catch {
        // Session fetch failed - user unauthenticated
      }
    }
    authReady.value = true;
  },
});
