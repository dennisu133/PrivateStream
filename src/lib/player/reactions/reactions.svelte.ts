export type Reaction = {
	id: string;
	name: string;
	url: string;
};

export type ReactionEvent = Reaction & {
	timestamp: number;
};

// Build the reactions list from assets at build time (client-side, no server round-trip)
const reactionModules = import.meta.glob<{ default: string }>(
	"$lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true }
);

export const reactions: Reaction[] = Object.entries(reactionModules).map(([path, module]) => {
	const filename = path.split("/").pop()!;
	const name = filename.replace(/\.[^.]+$/, "");
	return { id: filename, name, url: module.default };
});

// --- Trigger a reaction via POST ---

export async function triggerReaction(id: string): Promise<void> {
	const res = await fetch("/api/reactions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id })
	});

	if (!res.ok) {
		throw new Error(`Failed to trigger reaction: ${res.status}`);
	}
}

// --- SSE subscription for receiving reactions from other viewers ---

type ReactionListener = (event: ReactionEvent) => void;

// Lookup map for enriching SSE events with full reaction data
const reactionMap = new Map(reactions.map((r) => [r.id, r]));

const SSE_ENDPOINT = "/api/reactions";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30_000;

const listeners = new Set<ReactionListener>();
let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = RECONNECT_DELAY;

function clearReconnectTimer() {
	if (reconnectTimer !== null) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
}

function scheduleReconnect() {
	clearReconnectTimer();
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connect();
	}, reconnectDelay);
	reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
}

function connect() {
	if (typeof window === "undefined" || eventSource !== null || listeners.size === 0) {
		return;
	}

	eventSource = new EventSource(SSE_ENDPOINT, { withCredentials: true });

	eventSource.addEventListener("connected", () => {
		reconnectDelay = RECONNECT_DELAY;
	});

	eventSource.addEventListener("reaction", (e) => {
		try {
			const data = JSON.parse(e.data) as { id: string; timestamp: number };
			const reaction = reactionMap.get(data.id);
			if (reaction) {
				const event: ReactionEvent = { ...reaction, timestamp: data.timestamp };
				for (const listener of listeners) {
					listener(event);
				}
			}
		} catch {
			// Ignore malformed events
		}
	});

	eventSource.onerror = () => {
		disconnect();
		scheduleReconnect();
	};
}

function disconnect() {
	if (eventSource !== null) {
		eventSource.close();
		eventSource = null;
	}
}

/**
 * Subscribe to reaction events from other viewers via SSE.
 * Manages connection lifecycle automatically:
 * - Connects when the first listener subscribes
 * - Disconnects when the last listener unsubscribes
 * - Reconnects with exponential backoff on errors
 */
export function subscribeToReactions(listener: ReactionListener): () => void {
	listeners.add(listener);

	if (listeners.size === 1) {
		connect();
	}

	return () => {
		listeners.delete(listener);

		if (listeners.size === 0) {
			disconnect();
			clearReconnectTimer();
			reconnectDelay = RECONNECT_DELAY;
		}
	};
}
