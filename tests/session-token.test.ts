import { describe, expect, test } from "bun:test";
import {
	createSignedSessionToken,
	SESSION_TTL_SECONDS,
	verifySignedSessionToken
} from "../src/lib/server/session-token";

const secret = Buffer.alloc(32, 7);
const otherSecret = Buffer.alloc(32, 8);
const now = 1_750_000_000;
const nonce = "0123456789abcdef";

describe("session tokens", () => {
	test("accepts a valid unexpired token", () => {
		const token = createSignedSessionToken(secret, { nowSeconds: now, nonce });
		expect(verifySignedSessionToken(token, secret, now)).toBe(true);
	});

	test("rejects an expired token", () => {
		const token = createSignedSessionToken(secret, { nowSeconds: now, nonce });
		expect(verifySignedSessionToken(token, secret, now + SESSION_TTL_SECONDS)).toBe(false);
	});

	test("rejects a token signed by another secret", () => {
		const token = createSignedSessionToken(secret, { nowSeconds: now, nonce });
		expect(verifySignedSessionToken(token, otherSecret, now)).toBe(false);
	});

	test("rejects tampered and malformed tokens", () => {
		const token = createSignedSessionToken(secret, { nowSeconds: now, nonce });
		const [payload, signature] = token.split(".");

		expect(verifySignedSessionToken(`${payload}x.${signature}`, secret, now)).toBe(false);
		expect(verifySignedSessionToken("not-a-token", secret, now)).toBe(false);
	});
});
