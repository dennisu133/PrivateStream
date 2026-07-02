import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const SESSION_VERSION = 1;
const MAX_CLOCK_SKEW_SECONDS = 60;

type SessionPayload = {
	v: typeof SESSION_VERSION;
	iat: number;
	exp: number;
	nonce: string;
};

type CreateSessionTokenOptions = {
	nowSeconds?: number;
	nonce?: string;
};

function sign(payload: string, secret: Uint8Array): Buffer {
	return createHmac("sha256", secret).update(payload).digest();
}

function isSessionPayload(value: unknown, nowSeconds: number): value is SessionPayload {
	if (!value || typeof value !== "object") return false;

	const payload = value as Partial<SessionPayload>;
	if (payload.v !== SESSION_VERSION) return false;
	if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return false;
	if (typeof payload.nonce !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(payload.nonce)) {
		return false;
	}

	const issuedAt = payload.iat as number;
	const expiresAt = payload.exp as number;

	if (issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS) return false;
	if (expiresAt <= nowSeconds) return false;
	if (expiresAt <= issuedAt || expiresAt - issuedAt > SESSION_TTL_SECONDS) return false;

	return true;
}

export function createSignedSessionToken(
	secret: Uint8Array,
	options: CreateSessionTokenOptions = {}
): string {
	const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
	const payload: SessionPayload = {
		v: SESSION_VERSION,
		iat: nowSeconds,
		exp: nowSeconds + SESSION_TTL_SECONDS,
		nonce: options.nonce ?? randomBytes(18).toString("base64url")
	};
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const signature = sign(encodedPayload, secret).toString("base64url");

	return `${encodedPayload}.${signature}`;
}

export function verifySignedSessionToken(
	token: string,
	secret: Uint8Array,
	nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
	if (token.length > 2048) return false;

	const parts = token.split(".");
	if (parts.length !== 2) return false;

	const [encodedPayload, encodedSignature] = parts;
	if (!encodedPayload || !encodedSignature || !/^[A-Za-z0-9_-]{43}$/.test(encodedSignature)) {
		return false;
	}

	let providedSignature: Buffer;
	let payload: unknown;

	try {
		providedSignature = Buffer.from(encodedSignature, "base64url");
		payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
	} catch {
		return false;
	}

	const expectedSignature = sign(encodedPayload, secret);
	if (
		providedSignature.length !== expectedSignature.length ||
		!timingSafeEqual(providedSignature, expectedSignature)
	) {
		return false;
	}

	return isSessionPayload(payload, nowSeconds);
}
