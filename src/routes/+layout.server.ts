import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ locals }) => {
  const isAuthenticated = !!locals.user;

  const siteName = env.META_TITLE_PUBLIC ?? "PrivateStream";
  const siteNamePrivate = env.META_TITLE_PRIVATE ?? "Welcome back!";
  const description = env.META_DESCRIPTION ?? "Private livestream viewer.";
  const themeColor = env.META_COLOR ?? "#101018";
  const image = env.META_IMAGE ?? "/meta.gif";
  const url = env.META_URL ?? null;

  const title = isAuthenticated ? siteNamePrivate : siteName;

  return {
    meta: {
      title: title,
      description: description,
      themeColor: themeColor,
      image: image,
      url: url,
    },
  };
};