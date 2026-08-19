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

	// og:url must be this page's own canonical URL, so take the public origin from
	// the env and the path from the request. Without the env var the request's
	// origin is the best guess, and it is correct as long as ORIGIN is configured.
	const origin = $derived(import.meta.env.VITE_META_URL || page.url.origin);
	const url = $derived(new URL(page.url.pathname, origin).href);
	// og:image has to be absolute; an already-absolute env value passes through.
	const image = $derived(new URL(import.meta.env.VITE_META_IMAGE || "/meta.gif", origin).href);

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
