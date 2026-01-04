import type { Reaction } from "$lib/reactions.remote";

const SSE_ENDPOINT = "/api/reactions";
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

export type ReactionEvent = Reaction & {
	timestamp: number;
};

type ReactionListener = (event: ReactionEvent) => void;

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
	// Exponential backoff with max
	reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
}

function connect() {
	if (typeof window === "undefined" || eventSource !== null || listeners.size === 0) {
		return;
	}

	eventSource = new EventSource(SSE_ENDPOINT, { withCredentials: true });

	eventSource.addEventListener("connected", () => {
		// Reset backoff on successful connection
		reconnectDelay = RECONNECT_DELAY;
	});

	eventSource.addEventListener("reaction", (e) => {
		try {
			const data = JSON.parse(e.data) as ReactionEvent;
			if (data.id) {
				for (const listener of listeners) {
					listener(data);
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
 * Returns an unsubscribe function.
 *
 * The SSE connection is managed automatically:
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
