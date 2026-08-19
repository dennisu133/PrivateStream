import { fail, redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import bcrypt from "bcrypt";
import {
	createSessionToken,
	hasValidSessionSecret,
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS
} from "$lib/server/auth";
import { LOGIN_ATTEMPT_LIMIT, loginRateLimiter } from "$lib/server/rate-limit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
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
			// The global limit still protects bcrypt when no client address is available.
		}

		const rateLimit = loginRateLimiter.consume(clientAddress);
		const rateLimitHeaders = {
			"RateLimit-Limit": LOGIN_ATTEMPT_LIMIT.toString(),
			"RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString()
		};

		if (!rateLimit.allowed) {
			setHeaders({
				...rateLimitHeaders,
				"RateLimit-Remaining": "0",
				"Retry-After": rateLimit.retryAfterSeconds.toString()
			});
			return fail(429, {
				error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`
			});
		}

		setHeaders({
			...rateLimitHeaders,
			"RateLimit-Remaining": rateLimit.remaining.toString()
		});

		const passwordHash = Buffer.from(passwordHashBase64, "base64").toString();

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

		redirect(303, "/");
	}
};
