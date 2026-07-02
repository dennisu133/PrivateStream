import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";
import {
	createSignedSessionToken,
	SESSION_TTL_SECONDS,
	verifySignedSessionToken
} from "$lib/server/session-token";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_OPTIONS = {
	path: "/",
	httpOnly: true,
	sameSite: "lax" as const,
	secure: !dev,
	maxAge: SESSION_TTL_SECONDS
};

function getSessionSecret(): Buffer | null {
	const encodedSecret = env.SESSION_SECRET?.trim();
	if (!encodedSecret || !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSecret)) return null;

	const secret = Buffer.from(encodedSecret, "base64");
	return secret.length >= 32 ? secret : null;
}

export function hasValidSessionSecret(): boolean {
	return getSessionSecret() !== null;
}

export function createSessionToken(): string | null {
	const secret = getSessionSecret();
	return secret ? createSignedSessionToken(secret) : null;
}

export function verifySessionToken(token: string | undefined | null): boolean {
	if (!token) return false;

	const secret = getSessionSecret();
	return secret ? verifySignedSessionToken(token, secret) : false;
}
