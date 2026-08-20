type Counter = {
	count: number;
	resetAt: number;
};

export type RateLimitResult =
	| { allowed: true; remaining: number; resetAt: number }
	| { allowed: false; retryAfterSeconds: number; resetAt: number };

type FixedWindowRateLimiterOptions = {
	windowMs: number;
	perKeyLimit: number;
	globalLimit: number;
	maxKeys?: number;
};

export function createFixedWindowRateLimiter({
	windowMs,
	perKeyLimit,
	globalLimit,
	maxKeys = 10_000
}: FixedWindowRateLimiterOptions) {
	const keyedCounters = new Map<string, Counter>();
	let globalCounter: Counter = { count: 0, resetAt: 0 };

	function currentCounter(counter: Counter | undefined, now: number): Counter {
		if (!counter || counter.resetAt <= now) {
			return { count: 0, resetAt: now + windowMs };
		}
		return counter;
	}

	function reject({ resetAt }: Counter, now: number): RateLimitResult {
		return {
			allowed: false,
			// Never advertise 0: a client that retries that fast is just rejected again.
			retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
			resetAt
		};
	}

	function pruneExpired(now: number) {
		for (const [key, counter] of keyedCounters) {
			if (counter.resetAt <= now) keyedCounters.delete(key);
		}

		while (keyedCounters.size >= maxKeys) {
			const oldestKey = keyedCounters.keys().next().value;
			if (oldestKey === undefined) break;
			keyedCounters.delete(oldestKey);
		}
	}

	return {
		consume(key: string, now = Date.now()): RateLimitResult {
			globalCounter = currentCounter(globalCounter, now);
			const keyCounter = currentCounter(keyedCounters.get(key), now);

			if (globalCounter.count >= globalLimit) return reject(globalCounter, now);
			if (keyCounter.count >= perKeyLimit) return reject(keyCounter, now);

			if (!keyedCounters.has(key) && keyedCounters.size >= maxKeys) {
				pruneExpired(now);
			}

			globalCounter.count += 1;
			keyCounter.count += 1;
			keyedCounters.set(key, keyCounter);

			return {
				allowed: true,
				remaining: Math.min(globalLimit - globalCounter.count, perKeyLimit - keyCounter.count),
				resetAt: Math.min(globalCounter.resetAt, keyCounter.resetAt)
			};
		},

		resetKey(key: string) {
			keyedCounters.delete(key);
		}
	};
}

/** getClientAddress throws when the adapter cannot resolve one, and the global limit
    still applies to everyone who lands on the shared fallback key. */
export function clientKey(getClientAddress: () => string): string {
	try {
		return getClientAddress();
	} catch {
		return "unknown";
	}
}

export const LOGIN_ATTEMPT_LIMIT = 5;

export const loginRateLimiter = createFixedWindowRateLimiter({
	windowMs: 60_000,
	perKeyLimit: LOGIN_ATTEMPT_LIMIT,
	globalLimit: 30
});
