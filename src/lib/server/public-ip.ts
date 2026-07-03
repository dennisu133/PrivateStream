import { isIP } from "node:net";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type PublicIpResolverOptions = {
	/** Static IP that skips all external lookups when set (tier 1). */
	staticIp?: string;
	/** Plain-text IP echo services, tried in order (tier 2). */
	lookupUrls: string[];
	cacheMs?: number;
	lookupTimeoutMs?: number;
	fetchFn?: FetchLike;
	log?: (message: string) => void;
};

/**
 * Resolves the server's public IP for the SRS `eip` candidate.
 *
 * Resolution order:
 * 1. `staticIp`, if configured and valid — no external requests are made.
 * 2. The first `lookupUrls` service that returns a valid IP, cached for `cacheMs`.
 * 3. The last known IP when every lookup fails (stale-on-error).
 *
 * Concurrent callers share a single in-flight lookup.
 */
export function createPublicIpResolver({
	staticIp,
	lookupUrls,
	cacheMs = 60_000,
	lookupTimeoutMs = 5_000,
	fetchFn = fetch,
	log = console.warn
}: PublicIpResolverOptions) {
	const validStaticIp = staticIp && isIP(staticIp) ? staticIp : null;
	if (staticIp && !validStaticIp) {
		log(
			`Configured static public IP "${staticIp}" is not a valid IP address; falling back to lookup services.`
		);
	}

	let cached: { value: string; expiresAt: number } | null = null;
	let inFlight: Promise<string> | null = null;

	async function lookupOnce(url: string): Promise<string> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), lookupTimeoutMs);
		try {
			const res = await fetchFn(url, { signal: controller.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const ip = (await res.text()).trim();
			if (!isIP(ip)) throw new Error("response is not an IP address");
			return ip;
		} finally {
			clearTimeout(timer);
		}
	}

	async function lookup(): Promise<string> {
		for (const url of lookupUrls) {
			try {
				return await lookupOnce(url);
			} catch (e) {
				log(`IP lookup via ${url} failed: ${e instanceof Error ? e.message : String(e)}`);
			}
		}
		throw new Error("All IP lookup services failed");
	}

	return {
		async resolve(now = Date.now()): Promise<string> {
			if (validStaticIp) return validStaticIp;
			if (cached && cached.expiresAt > now) return cached.value;

			inFlight ??= lookup().finally(() => {
				inFlight = null;
			});

			try {
				const ip = await inFlight;
				cached = { value: ip, expiresAt: now + cacheMs };
				return ip;
			} catch (e) {
				if (cached) {
					log(`IP lookup failed; reusing last known IP ${cached.value}`);
					return cached.value;
				}
				throw e;
			}
		}
	};
}
