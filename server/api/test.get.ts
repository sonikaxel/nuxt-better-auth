export default defineEventHandler(async (event) => {
  const { user, session } = await requireUserSession(event);

  return { user, session };
});
