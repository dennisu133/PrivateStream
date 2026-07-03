import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { hasValidSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from "$lib/server/auth";

const authDisabled = env.DANGEROUSLY_DISABLE_AUTH === "true";

if (authDisabled) {
	console.warn(
		"⚠ DANGEROUSLY_DISABLE_AUTH is set: the password gate is OFF and every visitor is treated as logged in. Never use this in production."
	);
} else if (!env.SITE_PASSWORD_HASH || !hasValidSessionSecret()) {
	console.warn(
		"Authentication is not configured. Set SITE_PASSWORD_HASH and a base64 SESSION_SECRET of at least 32 bytes."
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	if (authDisabled) {
		event.locals.user = { authenticated: true };
	} else {
		const session = event.cookies.get(SESSION_COOKIE_NAME);
		const isValid = verifySessionToken(session);
		event.locals.user = isValid ? { authenticated: true } : null;
	}

	const response = await resolve(event);

	// `no-referrer` turns the Origin header into `null` for basic form POSTs,
	// which causes SvelteKit's CSRF protection to reject the login action.
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()"
	);

	if (!dev) {
		response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	}

	const routeId = event.route.id ?? "";
	if (
		routeId.includes("(protected)") ||
		event.url.pathname === "/login" ||
		event.url.pathname.startsWith("/api/")
	) {
		response.headers.set("Cache-Control", "private, no-store");
	}

	return response;
};
