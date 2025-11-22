import { existsSync } from "node:fs";
import type { Handle } from "@sveltejs/kit";
import { verifySessionToken } from "$lib/server/auth";

// Check .env file exists on startup
if (!existsSync(".env")) {
	console.error(
		"Missing .env file. Please create .env file with required configuration.",
	);
	process.exit(1);
}

export const handle: Handle = async ({ event, resolve }) => {
	const session = event.cookies.get("session");
	const isValid = verifySessionToken(session);
	event.locals.user = isValid ? { authenticated: true } : null;

	const response = await resolve(event);
	return response;
};
