export type Reaction = {
	id: string;
	name: string;
	url: string;
};

const reactionModules = import.meta.glob<{ default: string }>(
	"$lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true }
);

export const reactions: Reaction[] = Object.entries(reactionModules).map(([path, module]) => {
	const filename = path.split("/").pop()!;
	const name = filename.replace(/\.[^.]+$/, "");
	return { id: filename, name, url: module.default };
});

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

type ReactionListener = (reaction: Reaction) => void;

const reactionMap = new Map(reactions.map((r) => [r.id, r]));

const listeners = new Set<ReactionListener>();
let eventSource: EventSource | null = null;

function connect() {
	const source = new EventSource("/api/reactions");

	source.addEventListener("reaction", (e) => {
		let id: string;
		try {
			id = JSON.parse(e.data).id;
		} catch {
			return; // Malformed event.
		}

		const reaction = reactionMap.get(id);
		if (!reaction) return;

		for (const listener of listeners) {
			listener(reaction);
		}
	});

	return source;
}

/** Shares one EventSource across subscribers and closes it after the last unsubscribe. */
export function subscribeToReactions(listener: ReactionListener): () => void {
	listeners.add(listener);
	if (typeof window !== "undefined") eventSource ??= connect();

	return () => {
		listeners.delete(listener);

		if (listeners.size === 0) {
			eventSource?.close();
			eventSource = null;
		}
	};
}
