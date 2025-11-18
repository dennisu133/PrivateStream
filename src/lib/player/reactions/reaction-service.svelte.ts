const ENDPOINT = "/api/reactions";
const RECONNECT_DELAY = 2500;

export type ReactionItem = { id: string; name: string; url: string };
export type ReactionSignal = {
	reaction: ReactionItem;
	at: number;
	origin: "remote" | "local";
};

let manifest: ReactionItem[] | null = null;
let manifestPromise: Promise<ReactionItem[]> | null = null;

const listeners = new Set<(signal: ReactionSignal) => void>();
let es: EventSource | null = null;
let timer: number | null = null;

export function getCachedReactions() {
	return manifest;
}

export function loadReactions() {
	if (manifest) return Promise.resolve(manifest);
	if (manifestPromise) return manifestPromise;
	return (manifestPromise = fetch(ENDPOINT, {
		headers: { Accept: "application/json" },
	})
		.then((r) => r.json())
		.then((data) => {
			manifest = (data?.reactions || []).map((r: any) => ({
				id: String(r.id || r.file),
				name: String(r.name || r.id),
				url: String(r.url),
			}));
			return manifest!;
		})
		.finally(() => (manifestPromise = null)));
}

function connect() {
	if (typeof window === "undefined" || es || listeners.size === 0) return;
	es = new EventSource(ENDPOINT, { withCredentials: true });

	// Server sends "event: reaction"
	es.addEventListener("reaction", (e) => {
		try {
			const { reaction, at } = JSON.parse(e.data);
			if (reaction?.id) emit({ reaction, at, origin: "remote" });
		} catch {}
	});

	es.onerror = () => {
		es?.close();
		es = null;
		if (!timer) timer = window.setTimeout(connect, RECONNECT_DELAY);
	};
}

function emit(signal: ReactionSignal) {
	listeners.forEach((fn) => fn(signal));
}

export function subscribeToReactions(fn: (s: ReactionSignal) => void) {
	listeners.add(fn);
	if (listeners.size === 1) connect();
	return () => {
		listeners.delete(fn);
		if (listeners.size === 0) {
			es?.close();
			es = null;
			if (timer) clearTimeout(timer);
			timer = null;
		}
	};
}

export async function triggerReaction(reaction: ReactionItem) {
	await fetch(ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ type: "reaction", payload: { id: reaction.id } }),
	});
}
