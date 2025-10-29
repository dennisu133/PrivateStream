import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get("session");
  event.locals.user = session ? { authenticated: true } : null;

  const response = await resolve(event);
  return response;
};
