import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";
import { asset } from "$app/paths";

export const load: LayoutServerLoad = async ({ locals }) => {
	const isAuthenticated = !!locals.user;

	const siteName = env.META_TITLE_PUBLIC ?? "PrivateStream";
	const siteNamePrivate = env.META_TITLE_PRIVATE ?? "Welcome back!";
	const description = env.META_DESCRIPTION ?? "Private livestream viewer.";
	const themeColor = env.META_COLOR ?? "#101018";
	const fallbackImage = asset("/meta.gif");
	const image = env.META_IMAGE ?? fallbackImage;
	const url = env.META_URL ?? null;

	const title = isAuthenticated ? siteNamePrivate : siteName;

	return {
		meta: {
			title,
			description,
			themeColor,
			image,
			url,
		},
	};
};
