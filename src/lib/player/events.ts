import { parseStreamEvent, type StreamEvent } from "$lib/events";

export async function sendEvent(event: StreamEvent): Promise<void> {
	const response = await fetch("/api/events", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(event)
	});
	if (!response.ok) {
		throw new Error(
			response.status === 429
				? "Too many messages. Wait a moment and try again."
				: "Could not send. Please try again."
		);
	}
}

const listeners = new Set<(event: StreamEvent) => void>();
let source: EventSource | null = null;

/** Reactions and chat share one connection, closed after the last unsubscribe. */
export function subscribeToEvents(listener: (event: StreamEvent) => void): () => void {
	listeners.add(listener);
	if (!source && typeof window !== "undefined") {
		source = new EventSource("/api/events");
		const receive = (message: MessageEvent<string>) => {
			let event: StreamEvent | null;
			try {
				event = parseStreamEvent(JSON.parse(message.data));
			} catch {
				return;
			}
			if (event) for (const notify of listeners) notify(event);
		};
		source.addEventListener("reaction", receive);
		source.addEventListener("chat", receive);
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			source?.close();
			source = null;
		}
	};
}
