<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.ico";
	import DustParticles from "$lib/components/DustParticles.svelte";
	import { publicTitle } from "$lib/meta";
	import { page } from "$app/state";

	let { children } = $props();

	const description =
		import.meta.env.VITE_META_DESCRIPTION || "Private livestream viewer for friend groups.";
	const color = import.meta.env.VITE_META_COLOR || "#E4B583";
	const image = import.meta.env.VITE_META_IMAGE || "/meta.gif";

	// No sensible static default for the canonical URL; the request's own is closer
	// than a placeholder.
	const url = $derived(import.meta.env.VITE_META_URL || page.url.href);

	const isBoring = $derived(
		page.url.pathname === "/boring" ||
			(page.url.pathname === "/" && import.meta.env.BORING === "true")
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{publicTitle}</title>
	<meta name="description" content={description} />
	<meta name="theme-color" content={color} />
	<meta property="og:title" content={publicTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
</svelte:head>

<div
	class="relative isolate h-dvh w-screen overflow-hidden bg-theater-black"
	class:film-grain={!isBoring}
>
	{#if !isBoring}
		<DustParticles />
	{/if}

	<main class="relative z-10 flex h-full items-center justify-center">
		{@render children()}
	</main>
</div>
