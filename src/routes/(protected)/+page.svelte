<script lang="ts">
	import Catchip from "virtual:catchip-widget";
	import Player from "$lib/player/Player.svelte";
	import Neko from "virtual:neko-widget";
	import type { PageData } from "./$types";
	import { privateTitle } from "$lib/meta";

	let { data }: { data: PageData } = $props();
	const boring = import.meta.env.BORING === "true";
</script>

<svelte:head>
	<title>{privateTitle}</title>
</svelte:head>

<Player enableFunFeatures={!boring && data.reactionsEnabled} />
<Catchip />
<Neko />
