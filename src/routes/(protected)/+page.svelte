<script lang="ts">
	import Catchip from "virtual:catchip-widget";
	import Player from "$lib/player/Player.svelte";
	import Neko from "virtual:neko-widget";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
	const boring = import.meta.env.BORING === "true";
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PRIVATE}</title>
</svelte:head>

<Player enableFunFeatures={!boring && data.reactionsEnabled} />
<Catchip />
<Neko />
