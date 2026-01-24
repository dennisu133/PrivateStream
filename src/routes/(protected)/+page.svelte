<script lang="ts">
	import Catchip from "$lib/components/Catchip.svelte";
	import StatusBar from "$lib/components/StatusBar.svelte";
	import Player from "$lib/player/Player.svelte";

	let player = $state<ReturnType<typeof Player> | null>(null);

	const connectionState = $derived(player?.getConnectionState() ?? "new");
	const streamStatus = $derived(player?.getStreamStatus() ?? "pending");
</script>

<svelte:head>
	<title>{import.meta.env.VITE_META_TITLE_PRIVATE}</title>
</svelte:head>

<Player bind:this={player} />
<StatusBar {connectionState} {streamStatus} />
<Catchip />
