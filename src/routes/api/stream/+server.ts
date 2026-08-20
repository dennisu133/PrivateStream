import { error, json } from "@sveltejs/kit";
import { streamStatus } from "$lib/server/stream-live";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}
	return json({ live: await streamStatus.isLive() });
};
