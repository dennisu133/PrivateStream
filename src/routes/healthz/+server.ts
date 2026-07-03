import type { RequestHandler } from "./$types";

/**
 * Unauthenticated liveness probe for uptime monitors and process managers.
 * Confirms the app is serving requests, not that SRS or the stream is up.
 */
export const GET: RequestHandler = () => {
	return new Response("ok", {
		headers: {
			"Content-Type": "text/plain",
			"Cache-Control": "no-store"
		}
	});
};
