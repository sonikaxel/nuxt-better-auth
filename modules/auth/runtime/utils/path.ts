import { joinURL, withoutTrailingSlash } from 'ufo';

const apiBasePath = '/api/auth';
const apiSessionPath = '/get-session';

export function getAPIBasePath() {
  const { baseURL } = useRuntimeConfig().app;
  const path = joinURL(baseURL, apiBasePath);
  return withoutTrailingSlash(path);
}

export function getAPISessionPath() {
  const basePath = getAPIBasePath();
  return joinURL(basePath, apiSessionPath);
}
