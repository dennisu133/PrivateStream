import { env } from "$env/dynamic/private";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, "/login");
	}

	return { reactionsEnabled: env.REACTIONS !== "false" };
};
