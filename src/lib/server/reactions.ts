/**
 * Server-side SSE broadcast manager for reactions.
 * Manages connected clients and broadcasts reaction events to all viewers.
 */

export type ReactionEvent = {
	id: string;
	name: string;
	url: string;
	timestamp: number;
};

const streams = new Set<ReadableStreamDefaultController>();

// Keep-alive ping every 30 seconds to prevent connection timeout
const KEEPALIVE_INTERVAL = 30_000;

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

function startKeepAlive() {
	if (keepAliveTimer) return;

	keepAliveTimer = setInterval(() => {
		const ping = new TextEncoder().encode(": keepalive\n\n");
		for (const controller of streams) {
			try {
				controller.enqueue(ping);
			} catch {
				streams.delete(controller);
			}
		}
	}, KEEPALIVE_INTERVAL);
}

function stopKeepAlive() {
	if (keepAliveTimer && streams.size === 0) {
		clearInterval(keepAliveTimer);
		keepAliveTimer = null;
	}
}

/**
 * Creates a new SSE stream for a client.
 * Returns a Response that can be sent to the client.
 */
export function createSSEStream(): Response {
	const stream = new ReadableStream({
		start(controller) {
			streams.add(controller);
			startKeepAlive();

			// Send initial connection confirmation
			const connected = new TextEncoder().encode("event: connected\ndata: {}\n\n");
			controller.enqueue(connected);
		},
		cancel() {
			// This is called when the client disconnects
			// The controller is already removed from the set in this case
			stopKeepAlive();
		}
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no" // Disable nginx buffering
		}
	});
}

/**
 * Broadcasts a reaction event to all connected clients.
 * This should be called from the triggerReaction command.
 */
export function broadcastReaction(reaction: ReactionEvent): void {
	const data = JSON.stringify(reaction);
	const message = `event: reaction\ndata: ${data}\n\n`;
	const bytes = new TextEncoder().encode(message);

	for (const controller of streams) {
		try {
			controller.enqueue(bytes);
		} catch {
			streams.delete(controller);
		}
	}
}

/**
 * Returns the number of currently connected clients.
 * Useful for debugging/monitoring.
 */
export function getConnectedCount(): number {
	return streams.size;
}
