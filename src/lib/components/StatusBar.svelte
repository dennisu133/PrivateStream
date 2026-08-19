<script lang="ts">
	import StatusIndicator from "$lib/components/StatusIndicator.svelte";
	import { connection } from "$lib/state/connection.svelte";
	import type { IndicatorState, ReceivingState } from "$lib/types";

	type Indicator = { state: IndicatorState; label: string };

	const connectionIndicators: Partial<Record<RTCPeerConnectionState, Indicator>> = {
		connected: { state: "ok", label: "Connected" },
		failed: { state: "warn", label: "Failed" },
		disconnected: { state: "warn", label: "Disconnected" },
		closed: { state: "warn", label: "Closed" }
	};
	const streamIndicators: Record<ReceivingState, Indicator> = {
		pending: { state: "pending", label: "Checking..." },
		live: { state: "ok", label: "Live" },
		idle: { state: "warn", label: "No Stream" }
	};

	const connectionIndicator: Indicator = $derived(
		connectionIndicators[connection.state] ?? { state: "pending", label: "Connecting..." }
	);
	const streamIndicator = $derived(streamIndicators[connection.stream]);
</script>

<div
	class="mt-5 flex items-center gap-4 px-1 font-mono text-xs tracking-wider"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	<StatusIndicator state={connectionIndicator.state} label={connectionIndicator.label} />
	{#if connectionIndicator.state === "ok"}
		<!-- Match the divider to the text cap height. -->
		<span class="h-[0.75em] w-px translate-y-[-0.042em] bg-theater-border" aria-hidden="true"
		></span>
		<StatusIndicator state={streamIndicator.state} label={streamIndicator.label} />
	{/if}
</div>
