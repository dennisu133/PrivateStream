<script lang="ts">
	import StatusBar from "$lib/components/StatusBar.svelte";
	import Player from "$lib/player/Player.svelte";

	let player = $state<ReturnType<typeof Player> | null>(null);

	const connectionState = $derived(player?.getConnectionState() ?? "new");
	const streamStatus = $derived(player?.getStreamStatus() ?? "pending");
</script>

<Player bind:this={player} enableFunFeatures={false} />
<StatusBar {connectionState} {streamStatus} />
