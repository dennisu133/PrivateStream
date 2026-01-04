<script lang="ts">
	import Catchip from "$lib/components/Catchip.svelte";
	import Player from "$lib/player/Player.svelte";
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PRIVATE}</title>
</svelte:head>

<Player />
<Catchip />
