<!-- Public showcase page: the full theater experience without authentication. -->
<!-- Plays a looping local clip instead of the live WHEP stream; reactions are -->
<!-- disabled because their endpoints require a session. -->

<script lang="ts">
	import Catchip from "$lib/components/Catchip.svelte";
	import StatusBar from "$lib/components/StatusBar.svelte";
	import Player from "$lib/player/Player.svelte";
	import Neko from "$lib/components/Neko.svelte";
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PUBLIC} — Demo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<Player demoSrc="/demo.mp4" enableFunFeatures={false} />
<StatusBar />
<Catchip />
<Neko />

<div
	class="fixed top-5 right-5 z-60 rounded-sm border border-theater-border bg-theater-dark/90 px-4 py-2.5 font-mono text-xs tracking-wider backdrop-blur-sm"
>
	DEMO MODE
</div>
