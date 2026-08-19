import { isIP } from "node:net";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type PublicIpResolverOptions = {
	staticIp?: string;
	lookupUrls: string[];
	cacheMs?: number;
	lookupTimeoutMs?: number;
	fetchFn?: FetchLike;
	log?: (message: string) => void;
};

/**
 * Resolves the public IP used for SRS `eip`.
 * A valid static IP skips external lookups. Otherwise, services are tried in
 * order and cached. Failed refreshes reuse the last result, and concurrent
 * callers share one lookup.
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
		const res = await fetchFn(url, { signal: AbortSignal.timeout(lookupTimeoutMs) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const ip = (await res.text()).trim();
		if (!isIP(ip)) throw new Error("response is not an IP address");
		return ip;
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
			} catch (error) {
				if (cached) {
					log(`IP lookup failed; reusing last known IP ${cached.value}`);
					return cached.value;
				}
				throw error;
			}
		}
	};
}
