import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createSSEStream } from "$lib/server/reactions";

/**
 * SSE endpoint for real-time reaction broadcasts.
 * Clients connect here to receive reaction events from other viewers.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}

	return createSSEStream();
};
