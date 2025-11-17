const REACTIONS_ENDPOINT = "/api/reactions";

export type ReactionItem = {
	id: string;
	name: string;
	url: string;
};

export type ReactionSignal = {
	reaction: ReactionItem;
	at: number;
	origin: "remote" | "local";
};

const listeners = new Set<(signal: ReactionSignal) => void>();

let eventSource: EventSource | null = null;
let reconnectTimer: number | null = null;

let manifest: ReactionItem[] | null = null;
let manifestPromise: Promise<ReactionItem[]> | null = null;

const RECONNECT_DELAY = 2500;

function normalizeReaction(input: unknown) {
	if (!input || typeof input !== "object") return null;
	const raw = input as Record<string, unknown>;
	const id = String(raw.id ?? raw.file ?? "");
	const url = String(raw.url ?? "");
	const name = String(raw.name ?? "") || id;
	if (!id || !url) return null;
	return { id, name, url } as ReactionItem;
}

function normalizeReactions(data: unknown) {
	if (!data || typeof data !== "object") return [] as ReactionItem[];
	const raw = data as Record<string, unknown>;
	if (!Array.isArray(raw.reactions)) return [] as ReactionItem[];
	const list: ReactionItem[] = [];
	for (const entry of raw.reactions) {
		const reaction = normalizeReaction(entry);
		if (reaction) list.push(reaction);
	}
	return list;
}

function emit(signal: ReactionSignal) {
	for (const listener of listeners) {
		try {
			listener(signal);
		} catch (error) {
			console.error("Reaction listener failed", error);
		}
	}
}

async function fetchReactions() {
	const response = await fetch(REACTIONS_ENDPOINT, {
		method: "GET",
		credentials: "same-origin",
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`Failed to load reactions (HTTP ${response.status})`);
	}
	const data = await response.json();
	const list = normalizeReactions(data);
	manifest = list;
	return list;
}

function teardownEventStream() {
	if (!eventSource) return;
	eventSource.removeEventListener("reaction", handleMessage);
	eventSource.removeEventListener("error", handleError);
	eventSource.close();
	eventSource = null;
}

function scheduleReconnect() {
	if (typeof window === "undefined") return;
	if (listeners.size === 0) return;
	if (reconnectTimer) return;
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null;
		if (listeners.size > 0) ensureEventStream();
	}, RECONNECT_DELAY);
}

function handleMessage(event: MessageEvent<string>) {
	let payload: unknown;
	try {
		payload = JSON.parse(event.data ?? "{}");
	} catch {
		payload = {};
	}
	if (!payload || typeof payload !== "object") return;
	const raw = payload as { reaction?: unknown; at?: unknown };
	const reaction = normalizeReaction(raw.reaction);
	if (!reaction) return;
	const at =
		typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : Date.now();
	emit({ reaction, at, origin: "remote" });
}

function handleError() {
	if (!eventSource) return;
	if (eventSource.readyState === EventSource.CLOSED) {
		teardownEventStream();
		scheduleReconnect();
	}
}

function ensureEventStream() {
	if (typeof window === "undefined") return;
	if (eventSource || listeners.size === 0) return;
	const source = new EventSource(REACTIONS_ENDPOINT, { withCredentials: true });
	eventSource = source;
	source.addEventListener("reaction", handleMessage);
	source.addEventListener("error", handleError);
}

export function getCachedReactions() {
	return manifest;
}

export async function loadReactions(force = false) {
	if (!force) {
		if (manifest) return manifest;
		if (manifestPromise) return manifestPromise;
	}

	const promise = fetchReactions().catch((error) => {
		manifest = null;
		throw error instanceof Error
			? error
			: new Error("Failed to load reactions");
	});

	manifestPromise = promise;
	try {
		return await promise;
	} finally {
		manifestPromise = null;
	}
}

export function subscribeToReactions(
	listener: (signal: ReactionSignal) => void,
) {
	listeners.add(listener);
	if (listeners.size === 1) ensureEventStream();
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			teardownEventStream();
			if (reconnectTimer && typeof window !== "undefined") {
				window.clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
		}
	};
}

export async function triggerReaction(reaction: ReactionItem) {
	const response = await fetch(REACTIONS_ENDPOINT, {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ type: "reaction", payload: { id: reaction.id } }),
	});
	if (!response.ok) {
		throw new Error(`Failed to send reaction (HTTP ${response.status})`);
	}
}
