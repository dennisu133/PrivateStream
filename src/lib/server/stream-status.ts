type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export type StreamStatusOptions = {
	/** SRS HTTP API streams endpoint; null reports offline. */
	srsStreamsUrl: URL | null;
	stream?: { app: string; name: string };
	cacheTtlMs?: number;
	queryTimeoutMs?: number;
	fetchFn?: FetchLike;
	log?: (message: string) => void;
};

type SrsStream = { app?: string; name?: string; clients?: number; publish?: { active?: boolean } };

/**
 * Reports whether the broadcaster is publishing by querying the SRS HTTP API,
 * with a short cache shared across callers. A failed query keeps the last
 * known state.
 */
export function createStreamStatus({
	srsStreamsUrl,
	stream,
	cacheTtlMs = 2000,
	queryTimeoutMs = 3000,
	fetchFn = fetch,
	log = console.warn
}: StreamStatusOptions) {
	let live = false;
	let viewers: number | null = null;
	let checkedAt = -Infinity;
	let inFlight: Promise<void> | null = null;

	async function querySrs(): Promise<void> {
		const res = await fetchFn(srsStreamsUrl!, { signal: AbortSignal.timeout(queryTimeoutMs) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as { code?: number; streams?: SrsStream[] };
		if (data.code !== 0 || !Array.isArray(data.streams)) throw new Error("Invalid SRS response");
		const matching = data.streams.filter(
			(s) => !stream || (s.app === stream.app && s.name === stream.name)
		);
		live = matching.some((s) => s.publish?.active);
		// SRS counts both playback clients and the active publisher.
		viewers = matching.every((s) => Number.isInteger(s.clients) && s.clients! >= 0)
			? matching.reduce(
					(total, s) => total + Math.max(0, s.clients! - (s.publish?.active ? 1 : 0)),
					0
				)
			: null;
	}

	return {
		async get(now = Date.now()): Promise<{ live: boolean; viewers: number | null }> {
			if (!srsStreamsUrl) return { live, viewers };
			if (now - checkedAt >= cacheTtlMs) {
				checkedAt = now;
				inFlight ??= querySrs()
					.catch((e) => {
						viewers = null;
						log(`SRS stream query failed: ${e instanceof Error ? e.message : e}`);
					})
					.finally(() => {
						inFlight = null;
					});
			}
			if (inFlight) await inFlight;
			return { live, viewers };
		}
	};
}
