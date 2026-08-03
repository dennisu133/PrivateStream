<script lang="ts">
	import StatusIndicator from "$lib/components/StatusIndicator.svelte";
	import { getConnectionIndicator, getStreamIndicator } from "$lib/types";
	import { getConnectionState, getStreamStatus } from "$lib/state/connection.svelte";

	const connectionIndicator = $derived(getConnectionIndicator(getConnectionState()));
	const streamIndicator = $derived(getStreamIndicator(getStreamStatus()));
</script>

<div
	class="mt-5 flex items-center gap-4 px-1 font-mono text-xs tracking-wider"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	<StatusIndicator state={connectionIndicator.state} label={connectionIndicator.label} />
	{#if connectionIndicator.state === "ok"}
		<!-- Cap-height too, so the divider matches the LEDs and the type -->
		<span class="h-[0.75em] w-px translate-y-[-0.042em] bg-theater-border" aria-hidden="true"
		></span>
		<StatusIndicator state={streamIndicator.state} label={streamIndicator.label} />
	{/if}
</div>
