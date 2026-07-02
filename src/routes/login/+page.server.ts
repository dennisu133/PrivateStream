import { fail, redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import bcrypt from "bcrypt";
import {
	createSessionToken,
	hasValidSessionSecret,
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS
} from "$lib/server/auth";
import { loginRateLimiter } from "$lib/server/rate-limit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	// If the user is already logged in, redirect them to the stream page
	if (locals.user) {
		redirect(303, "/");
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, setHeaders }) => {
		const data = await request.formData();
		const password = data.get("password")?.toString();

		const passwordHashBase64 = env.SITE_PASSWORD_HASH;

		if (!passwordHashBase64 || !hasValidSessionSecret()) {
			return fail(500, { error: "Server authentication is not configured correctly." });
		}

		if (!password) {
			return fail(400, { error: "Password is required." });
		}

		let clientAddress = "unknown";
		try {
			clientAddress = getClientAddress();
		} catch {
			// The global limit still protects bcrypt if the adapter cannot resolve a client address.
		}

		const rateLimit = loginRateLimiter.consume(clientAddress);
		if (!rateLimit.allowed) {
			setHeaders({
				"Retry-After": rateLimit.retryAfterSeconds.toString(),
				"RateLimit-Limit": "5",
				"RateLimit-Remaining": "0",
				"RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
			});
			return fail(429, {
				error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`
			});
		}

		setHeaders({
			"RateLimit-Limit": "5",
			"RateLimit-Remaining": rateLimit.remaining.toString(),
			"RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
		});

		// Decode base64 hash back to original bcrypt hash
		const passwordHash = Buffer.from(passwordHashBase64, "base64").toString();

		// Use bcrypt to securely compare the submitted password with the stored hash
		const match = await bcrypt.compare(password, passwordHash);

		if (!match) {
			return fail(401, { error: "Invalid password." });
		}

		loginRateLimiter.resetKey(clientAddress);

		const sessionToken = createSessionToken();
		if (!sessionToken) {
			return fail(500, { error: "Server configuration error." });
		}

		cookies.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);

		// Redirect to the stream page
		redirect(303, "/");
	}
};
