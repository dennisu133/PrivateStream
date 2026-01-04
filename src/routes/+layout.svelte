<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.ico";

	let { children } = $props();

	const title = import.meta.env.VITE_META_TITLE_PUBLIC || "PrivateStream";
	const description =
		import.meta.env.VITE_META_DESCRIPTION || "Private livestream viewer for friend groups.";
	const color = import.meta.env.VITE_META_COLOR || "#09090b";
	const image = import.meta.env.VITE_META_IMAGE || "/meta.gif";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="theme-color" content={color} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={image} />
</svelte:head>

<main class="flex h-screen w-screen items-center justify-center">
	{@render children?.()}
</main>
