import { toWebRequest } from '#imports';

export default defineEventHandler(async (event) => {
  return serverAuth().handler(toWebRequest(event));
});
