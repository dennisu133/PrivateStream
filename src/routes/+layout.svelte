<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.ico";
	import { page } from "$app/state";

	let { children } = $props();

	const title = import.meta.env.VITE_META_TITLE_PUBLIC || "PrivateStream";
	const description =
		import.meta.env.VITE_META_DESCRIPTION || "Private livestream viewer for friend groups.";
	const color = import.meta.env.VITE_META_COLOR || "#E4B583";
	const image = import.meta.env.VITE_META_IMAGE || "/meta.gif";

	const isBoring = $derived(
		page.url.pathname === "/boring" ||
			(page.url.pathname === "/" && import.meta.env.BORING === "true")
	);

	const particles = Array.from({ length: 10 }, (_, i) => ({
		id: i,
		left: `${Math.random() * 100}%`,
		size: `${1 + Math.random() * 2.5}px`,
		duration: `${12 + Math.random() * 20}s`,
		delay: `${-Math.random() * 20}s`,
		opacity: 0.1 + Math.random() * 0.2,
		alt: i % 3 === 0
	}));
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

<div
	class="relative isolate h-screen w-screen overflow-hidden bg-theater-black"
	class:film-grain={!isBoring}
>
	{#if !isBoring}
		<div class="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
			{#each particles as p (p.id)}
				<div
					class="dust-particle"
					style="
						left: {p.left};
						width: {p.size};
						height: {p.size};
						animation-duration: {p.duration};
						animation-delay: {p.delay};
						opacity: {p.opacity};
						{p.alt ? 'animation-name: dust-float-alt;' : ''}
					"
				></div>
			{/each}
		</div>
	{/if}

	<main class="relative z-10 flex h-full w-full items-center justify-center">
		{@render children?.()}
	</main>
</div>
