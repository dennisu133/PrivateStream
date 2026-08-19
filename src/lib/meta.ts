// Titles are read in four places; the fallbacks keep an unset env var from
// rendering "undefined" into a <title>.
export const publicTitle = import.meta.env.VITE_META_TITLE_PUBLIC || "PrivateStream";
export const privateTitle = import.meta.env.VITE_META_TITLE_PRIVATE || publicTitle;
