import { query, command } from "$app/server";
import * as v from "valibot";
import { broadcastReaction, type ReactionEvent } from "$lib/server/reactions";

export type Reaction = {
	id: string;
	name: string;
	url: string;
};

// Import all reaction images from assets at build time
const reactionModules = import.meta.glob<{ default: string }>(
	"$lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true }
);

// Build the reactions list from the imported modules
const reactions: Reaction[] = Object.entries(reactionModules).map(([path, module]) => {
	const filename = path.split("/").pop()!;
	const name = filename.replace(/\.[^.]+$/, "");
	return {
		id: filename,
		name,
		url: module.default
	};
});

// Create a lookup map for quick validation
const reactionMap = new Map(reactions.map((r) => [r.id, r]));

/**
 * Query to get all available reactions.
 * Since reactions are static assets, this can be cached.
 */
export const getReactions = query(() => {
	return reactions;
});

/**
 * Command to trigger a reaction.
 * Broadcasts the reaction to all connected SSE clients.
 */
export const triggerReaction = command(
	v.object({
		id: v.string()
	}),
	async ({ id }) => {
		const reaction = reactionMap.get(id);
		if (!reaction) {
			throw new Error(`Unknown reaction: ${id}`);
		}

		const event: ReactionEvent = {
			...reaction,
			timestamp: Date.now()
		};

		broadcastReaction(event);

		return { success: true };
	}
);
