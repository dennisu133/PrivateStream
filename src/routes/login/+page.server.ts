import { fail, redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import bcrypt from "bcrypt";
import { createSessionToken } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	// If the user is already logged in, redirect them to the stream page
	if (locals.user) {
		redirect(303, "/");
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get("password")?.toString();

		const passwordHashBase64 = env.SITE_PASSWORD_HASH;

		if (!passwordHashBase64) {
			return fail(500, { error: "Server is not configured with a password." });
		}

		if (!password) {
			return fail(400, { error: "Password is required." });
		}

		// Decode base64 hash back to original bcrypt hash
		const passwordHash = Buffer.from(passwordHashBase64, "base64").toString();

		// Use bcrypt to securely compare the submitted password with the stored hash
		const match = await bcrypt.compare(password, passwordHash);

		if (!match) {
			return fail(401, { error: "Invalid password." });
		}

		const sessionToken = createSessionToken();
		if (!sessionToken) {
			return fail(500, { error: "Server configuration error." });
		}

		// Set the session cookie
		cookies.set("session", sessionToken, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: 60 * 60 * 24 * 7, // 1 week
		});

		// Redirect to the stream page
		redirect(303, "/");
	},
};
