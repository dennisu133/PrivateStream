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

	test("reports the tighter of the two remaining budgets", () => {
		const perKeyIsTighter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 3,
			globalLimit: 10
		});
		expect(perKeyIsTighter.consume("one", 0)).toMatchObject({ allowed: true, remaining: 2 });

		const globalIsTighter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 10,
			globalLimit: 3
		});
		expect(globalIsTighter.consume("one", 0)).toMatchObject({ allowed: true, remaining: 2 });
	});

	test("evicts the oldest key once maxKeys is reached", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 1,
			globalLimit: 100,
			maxKeys: 2
		});

		expect(limiter.consume("a", 0).allowed).toBe(true);
		expect(limiter.consume("b", 0).allowed).toBe(true);
		expect(limiter.consume("a", 0).allowed).toBe(false);

		// The map is full and "c" is new, so the oldest entry is dropped to make room.
		expect(limiter.consume("c", 0).allowed).toBe(true);
		// "b" was inserted after "a" and survives, still spent.
		expect(limiter.consume("b", 0).allowed).toBe(false);
		// "a" was evicted, so it comes back with a fresh budget.
		expect(limiter.consume("a", 0).allowed).toBe(true);
	});

	test("resetKey clears that key's counter", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 1,
			globalLimit: 100
		});

		expect(limiter.consume("one", 0).allowed).toBe(true);
		expect(limiter.consume("one", 1).allowed).toBe(false);

		limiter.resetKey("one");
		expect(limiter.consume("one", 2).allowed).toBe(true);
	});

	test("resetKey does not refund the global budget", () => {
		const limiter = createFixedWindowRateLimiter({
			windowMs: 60_000,
			perKeyLimit: 5,
			globalLimit: 2
		});

		expect(limiter.consume("one", 0).allowed).toBe(true);
		expect(limiter.consume("two", 0).allowed).toBe(true);

		limiter.resetKey("one");
		expect(limiter.consume("one", 0).allowed).toBe(false);
	});
});
