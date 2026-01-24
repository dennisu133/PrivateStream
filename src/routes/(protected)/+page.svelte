<script lang="ts">
	import Catchip from "$lib/components/Catchip.svelte";
	import StatusBar from "$lib/components/StatusBar.svelte";
	import Player from "$lib/player/Player.svelte";
	import Neko from "$lib/components/Neko.svelte";
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PRIVATE}</title>
</svelte:head>

<Player />
<StatusBar />
<Catchip />
<Neko />
