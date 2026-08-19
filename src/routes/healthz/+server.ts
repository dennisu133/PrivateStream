import type { RequestHandler } from "./$types";

// Checks the app only, not SRS or stream availability.
export const GET: RequestHandler = () =>
	new Response("ok", {
		headers: {
			"Content-Type": "text/plain",
			"Cache-Control": "no-store"
		}
	});
