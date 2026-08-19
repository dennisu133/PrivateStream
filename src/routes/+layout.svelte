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
					class:alt={p.alt}
					style="
						left: {p.left};
						width: {p.size};
						height: {p.size};
						animation-duration: {p.duration};
						animation-delay: {p.delay};
					"
				></div>
			{/each}
		</div>
	{/if}

	<main class="relative z-10 flex h-full w-full items-center justify-center">
		{@render children?.()}
	</main>
</div>

<style>
	.film-grain::before {
		content: "";
		position: fixed;
		inset: 0;
		opacity: 0.05;
		pointer-events: none;
		z-index: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
		background-size: 256px 256px;
	}

	.dust-particle {
		position: absolute;
		border-radius: 50%;
		background: color-mix(in oklch, var(--color-theater-paper) 30%, transparent);
		animation: dust-float linear infinite;
	}

	.dust-particle.alt {
		animation-name: dust-float-alt;
	}

	@keyframes dust-float {
		0% {
			transform: translateY(100vh) translateX(0) scale(1);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(-10vh) translateX(30px) scale(0.5);
			opacity: 0;
		}
	}

	@keyframes dust-float-alt {
		0% {
			transform: translateY(100vh) translateX(0) rotate(0deg);
			opacity: 0;
		}
		15% {
			opacity: 0.8;
		}
		85% {
			opacity: 0.6;
		}
		100% {
			transform: translateY(-10vh) translateX(-20px) rotate(180deg);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dust-particle {
			display: none;
		}
	}
</style>
