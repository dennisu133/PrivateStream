const REACTIONS_ENDPOINT = "/api/reactions";

export type ReactionItem = {
	name: string;
	url: string;
	file: string;
};

export type ReactionBroadcastPayload = {
	url?: string;
	name?: string;
	at?: number;
};

type Listener = (payload: ReactionBroadcastPayload) => void;

let manifestCache: ReactionItem[] | null = null;
let manifestPromise: Promise<ReactionItem[]> | null = null;
let manifestError: Error | null = null;
let thumbnailsPrefetched = false;

const listeners = new Set<Listener>();
let eventSource: EventSource | null = null;
let eventSourceHandlers: { open: () => void; error: () => void } | null = null;
let reconnectTimer: number | null = null;
let backoffMs = 2000;

const MAX_BACKOFF_MS = 30000;

function normalizeManifest(data: unknown): ReactionItem[] {
	if (
		data &&
		typeof data === "object" &&
		"reactions" in data &&
		Array.isArray((data as { reactions: unknown }).reactions)
	) {
		const items = (data as { reactions: unknown[] }).reactions;
		return items
			.map((entry) => {
				if (!entry || typeof entry !== "object") return null;
				const name = String((entry as Record<string, unknown>).name ?? "");
				const url = String((entry as Record<string, unknown>).url ?? "");
				const file = String((entry as Record<string, unknown>).file ?? "");
				if (!name || !url || !file) return null;
				return { name, url, file };
			})
			.filter(Boolean) as ReactionItem[];
	}
	return [];
}

function prefetchThumbnails(list: ReactionItem[], limit = 12) {
	if (typeof window === "undefined" || thumbnailsPrefetched) return;
	const total = Math.min(limit, list.length);
	for (let i = 0; i < total; i += 1) {
		const img = new Image();
		img.decoding = "async";
		img.loading = "lazy";
		img.src = list[i]?.url ?? "";
	}
	thumbnailsPrefetched = true;
}

async function requestManifest(): Promise<ReactionItem[]> {
	const res = await fetch(REACTIONS_ENDPOINT, {
		method: "GET",
		credentials: "same-origin",
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		throw new Error(`Failed to load reactions (HTTP ${res.status})`);
	}
	const data = await res.json();
	const reactions = normalizeManifest(data);
	manifestCache = reactions;
	manifestError = null;
	prefetchThumbnails(reactions);
	return reactions;
}

export function getReactionManifest() {
	return manifestCache;
}

export function getReactionManifestError() {
	return manifestError;
}

export async function ensureReactionManifest(options?: { refresh?: boolean }) {
	if (!options?.refresh) {
		if (manifestCache) return manifestCache;
		if (manifestPromise) return manifestPromise;
	}
	const promise = requestManifest().catch((error) => {
		manifestCache = null;
		manifestError =
			error instanceof Error ? error : new Error("Failed to load reactions");
		throw manifestError;
	});
	manifestPromise = promise;
	try {
		return await promise;
	} finally {
		manifestPromise = null;
	}
}

function cleanupEventSource() {
	if (!eventSource) return;
	eventSource.removeEventListener("reaction", handleReactionEvent);
	if (eventSourceHandlers) {
		eventSource.removeEventListener("open", eventSourceHandlers.open);
		eventSource.removeEventListener("error", eventSourceHandlers.error);
	}
	eventSource.close();
	eventSource = null;
	eventSourceHandlers = null;
}

function scheduleReconnect() {
	if (typeof window === "undefined") return;
	if (listeners.size === 0) return;
	if (reconnectTimer) return;
	const delay = Math.min(backoffMs, MAX_BACKOFF_MS);
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null;
		connectEventSource();
	}, delay);
	backoffMs = Math.min(Math.floor(backoffMs * 1.5), MAX_BACKOFF_MS);
}

function handleReactionEvent(event: MessageEvent<string>) {
	let payload: ReactionBroadcastPayload = {};
	try {
		payload = JSON.parse(event.data ?? "{}") as ReactionBroadcastPayload;
	} catch {
		payload = {};
	}
	for (const listener of listeners) {
		try {
			listener(payload);
		} catch (err) {
			console.error("Reaction listener failed", err);
		}
	}
}

function connectEventSource() {
	if (typeof window === "undefined") return;
	if (eventSource || listeners.size === 0) return;

	const source = new EventSource(REACTIONS_ENDPOINT, { withCredentials: true });
	eventSource = source;
	backoffMs = 2000;

	const onOpen = () => {
		backoffMs = 2000;
	};
	const onError = () => {
		if (!eventSource) return;
		if (eventSource.readyState === EventSource.CLOSED) {
			cleanupEventSource();
			scheduleReconnect();
		}
	};

	eventSourceHandlers = { open: onOpen, error: onError };
	source.addEventListener("open", onOpen);
	source.addEventListener("error", onError);
	source.addEventListener("reaction", handleReactionEvent);
}

export function subscribeToReactions(listener: Listener) {
	listeners.add(listener);
	connectEventSource();
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			if (reconnectTimer) {
				if (typeof window !== "undefined") {
					window.clearTimeout(reconnectTimer);
				}
				reconnectTimer = null;
			}
			cleanupEventSource();
		}
	};
}

export async function triggerReaction(payload: ReactionBroadcastPayload) {
	await fetch(REACTIONS_ENDPOINT, {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			type: "reaction",
			payload,
		}),
	});
}
