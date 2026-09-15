<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.ico";
	import fontBebasNeue from "$lib/assets/fonts/bebas-neue-400.woff2";
	import fontGeistMono from "$lib/assets/fonts/geist-mono-300-500.woff2";

	import DustParticles from "$lib/components/DustParticles.svelte";
	import { publicTitle } from "$lib/meta";
	import { page } from "$app/state";

	let { children } = $props();

	// prettier-ignore
	const description = import.meta.env.VITE_META_DESCRIPTION || "Private livestream viewer for friend groups.";

	const color = import.meta.env.VITE_META_COLOR || "#E4B583";
	const image = $derived(
		new URL(import.meta.env.VITE_OG_IMAGE || "/og-image.gif", page.url.origin).href
	);
</script>

<svelte:head>
	<link rel="preload" href={fontBebasNeue} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={fontGeistMono} as="font" type="font/woff2" crossorigin="anonymous" />

	<link rel="icon" href={favicon} />
	<title>{publicTitle}</title>
	<meta name="description" content={description} />
	<meta name="theme-color" content={color} />
	<meta property="og:title" content={publicTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin + page.url.pathname} />
	<meta property="og:image" content={image} />
</svelte:head>

<div class="film-grain relative isolate h-dvh w-screen bg-background">
	<DustParticles />

	<main class="relative z-10 flex h-full items-center justify-center">
		{@render children()}
	</main>
</div>
