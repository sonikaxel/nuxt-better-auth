export default defineEventHandler(async (event) => {
  const { user, session } = await requireUserSession(event, {
    rule: ({ user }) => user.emailVerified === true,
  });

  return { user, session };
});
