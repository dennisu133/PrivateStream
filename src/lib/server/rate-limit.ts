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

	function retryAfterSeconds(resetAt: number, now: number): number {
		return Math.max(1, Math.ceil((resetAt - now) / 1000));
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

			if (globalCounter.count >= globalLimit) {
				return {
					allowed: false,
					retryAfterSeconds: retryAfterSeconds(globalCounter.resetAt, now),
					resetAt: globalCounter.resetAt
				};
			}

			if (keyCounter.count >= perKeyLimit) {
				return {
					allowed: false,
					retryAfterSeconds: retryAfterSeconds(keyCounter.resetAt, now),
					resetAt: keyCounter.resetAt
				};
			}

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

export const loginRateLimiter = createFixedWindowRateLimiter({
	windowMs: 60_000,
	perKeyLimit: 5,
	globalLimit: 30
});
