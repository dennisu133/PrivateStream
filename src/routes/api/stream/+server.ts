import { error } from "@sveltejs/kit";
import { streamStatus } from "#lib/server/stream-live.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}
	return Response.json(await streamStatus.get(), { headers: { "Cache-Control": "no-store" } });
};
