import { sendEvent, subscribeToEvents } from "../events";

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

export function triggerReaction(id: string): Promise<void> {
	return sendEvent({ type: "reaction", id });
}

const reactionMap = new Map(reactions.map((r) => [r.id, r]));

export function subscribeToReactions(listener: (reaction: Reaction) => void): () => void {
	return subscribeToEvents((event) => {
		if (event.type !== "reaction") return;
		const reaction = reactionMap.get(event.id);
		if (reaction) listener(reaction);
	});
}
