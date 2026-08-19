<script lang="ts">
	import Catchip from "virtual:catchip-widget";
	import Player from "$lib/player/Player.svelte";
	import Neko from "virtual:neko-widget";
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PUBLIC} — Demo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Reactions require a session and stay disabled on this public page. -->
<Player demoSrc="/demo.mp4" enableFunFeatures={false} />
<Catchip />
<Neko />

<a
	href="https://github.com/dennisu133/PrivateStream"
	target="_blank"
	rel="noopener noreferrer"
	class="fixed top-5 right-5 z-60 max-w-[calc(100vw-2.5rem)] rounded-sm border border-theater-border bg-theater-black/80 px-4 py-2.5 text-right font-mono text-xs tracking-wider backdrop-blur-sm"
>
	<span class="text-theater-muted">Want to host this yourself?</span>
	<span class="block text-theater-gold-dim transition-colors hover:text-theater-gold">
		github.com/<wbr />dennisu133/<wbr />PrivateStream ↗
	</span>
</a>
