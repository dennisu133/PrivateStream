type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export type StreamStatusOptions = {
	/** SRS HTTP API streams endpoint; null reports offline. */
	srsStreamsUrl: URL | null;
	cacheTtlMs?: number;
	queryTimeoutMs?: number;
	fetchFn?: FetchLike;
	log?: (message: string) => void;
};

type SrsStream = { publish?: { active?: boolean } };

/**
 * Reports whether the broadcaster is publishing by querying the SRS HTTP API,
 * with a short cache shared across callers. A failed query keeps the last
 * known state.
 */
export function createStreamStatus({
	srsStreamsUrl,
	cacheTtlMs = 2000,
	queryTimeoutMs = 3000,
	fetchFn = fetch,
	log = console.warn
}: StreamStatusOptions) {
	let live = false;
	let checkedAt = -Infinity;
	let inFlight: Promise<void> | null = null;

	async function querySrs(): Promise<void> {
		const res = await fetchFn(srsStreamsUrl!, { signal: AbortSignal.timeout(queryTimeoutMs) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as { streams?: SrsStream[] };
		live = Boolean(data.streams?.some((s) => s.publish?.active));
	}

	return {
		async isLive(now = Date.now()): Promise<boolean> {
			if (!srsStreamsUrl) return live;
			if (now - checkedAt >= cacheTtlMs) {
				checkedAt = now;
				inFlight ??= querySrs()
					.catch((e) => log(`SRS stream query failed: ${e instanceof Error ? e.message : e}`))
					.finally(() => {
						inFlight = null;
					});
			}
			if (inFlight) await inFlight;
			return live;
		}
	};
}
