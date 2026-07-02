import { describe, expect, test } from "bun:test";
import { createFixedWindowRateLimiter } from "../src/lib/server/rate-limit";

describe("fixed-window login rate limiter", () => {
	test("limits repeated attempts by key", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 2,
			globalLimit: 10
		});

		expect(limiter.consume("one", 0).allowed).toBe(true);
		expect(limiter.consume("one", 1).allowed).toBe(true);
		expect(limiter.consume("one", 2)).toMatchObject({
			allowed: false,
			retryAfterSeconds: 60
		});
		expect(limiter.consume("two", 2).allowed).toBe(true);
	});

	test("enforces a global budget", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 10,
			globalLimit: 2
		});

		expect(limiter.consume("one", 0).allowed).toBe(true);
		expect(limiter.consume("two", 1).allowed).toBe(true);
		expect(limiter.consume("three", 2).allowed).toBe(false);
	});

	test("resets counters after the window", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 1_000,
			perKeyLimit: 1,
			globalLimit: 1
		});

		expect(limiter.consume("one", 0).allowed).toBe(true);
		expect(limiter.consume("one", 999).allowed).toBe(false);
		expect(limiter.consume("one", 1_000).allowed).toBe(true);
	});
});
