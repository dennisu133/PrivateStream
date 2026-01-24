<script lang="ts">
	import StatusIndicator from "$lib/player/StatusIndicator.svelte";
	import {
		getConnectionIndicator,
		getStreamIndicator,
		type ConnectionState,
		type ReceivingState
	} from "$lib/types";

	let {
		connectionState,
		streamStatus
	}: {
		connectionState: ConnectionState;
		streamStatus: ReceivingState;
	} = $props();

	const connectionIndicator = $derived(getConnectionIndicator(connectionState));
	const streamIndicator = $derived(getStreamIndicator(streamStatus));
</script>

<div
	class="fixed bottom-5 left-5 z-60 flex items-center gap-4 rounded-sm border border-theater-border bg-theater-dark/90 px-4 py-2.5 font-mono text-xs tracking-wider backdrop-blur-sm"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	<StatusIndicator state={connectionIndicator.state} label={connectionIndicator.label} />
	{#if connectionIndicator.state === "ok"}
		<span class="h-3 w-px bg-theater-border" aria-hidden="true"></span>
		<StatusIndicator state={streamIndicator.state} label={streamIndicator.label} />
	{/if}
</div>
