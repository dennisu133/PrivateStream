<script lang="ts">
	import { connection } from "$lib/state/connection.svelte";
	import type { IndicatorState, ReceivingState } from "$lib/types";

	type Indicator = { state: IndicatorState; label: string };

	// demo: a looping local file, so connection and stream state say nothing useful.
	let { demo = false }: { demo?: boolean } = $props();

	const connectionIndicators: Partial<Record<RTCPeerConnectionState, Indicator>> = {
		connected: { state: "ok", label: "Connected" },
		failed: { state: "warn", label: "Failed" },
		disconnected: { state: "warn", label: "Disconnected" },
		closed: { state: "warn", label: "Closed" }
	};
	const streamIndicators: Record<ReceivingState, Indicator> = {
		pending: { state: "pending", label: "Checking..." },
		live: { state: "ok", label: "Live" },
		idle: { state: "warn", label: "No Stream" },
		offline: { state: "off", label: "Stream Offline" }
	};

	// Exactly one colour class per element. Stacking a base colour with a state
	// override lets whichever Tailwind emits last win, not whichever is written last.
	const ledClasses: Record<IndicatorState, string> = {
		// text-* here is not for text: currentColor feeds the status-pulse box-shadow.
		ok: "status-live bg-emerald-400 text-emerald-400",
		warn: "bg-red-400",
		pending: "border border-theater-gold/25 bg-transparent",
		off: "border border-theater-gold/25 bg-transparent"
	};
	const labelClasses: Record<IndicatorState, string> = {
		ok: "text-emerald-400/85",
		warn: "text-red-400/85",
		pending: "text-theater-muted",
		off: "text-theater-muted"
	};

	const connectionIndicator: Indicator = $derived(
		connectionIndicators[connection.state] ?? { state: "pending", label: "Connecting..." }
	);
	const streamIndicator = $derived(streamIndicators[connection.stream]);
</script>

{#snippet indicator({ state, label }: Indicator)}
	<span
		class="inline-flex items-baseline gap-2.5 text-xs leading-none font-light tracking-widest uppercase"
	>
		<!-- No offset math: an empty box's baseline is its own bottom edge, and the cap
		     height is 0.75em, so baseline alignment seats the LED on the cap band at any
		     zoom. Offsets measured from the line box top cannot: the box snaps to device
		     pixels, the glyphs do not. overflow-hidden keeps the baseline synthesized
		     from the border box even while the spinner is inside. Metrics in app.css. -->
		<span
			class="relative inline-block size-[0.75em] shrink-0 overflow-hidden rounded-full {ledClasses[
				state
			]}"
			aria-hidden="true"
		>
			{#if state === "pending"}
				<span
					class="absolute inset-0 m-auto size-1.5 animate-spin rounded-full border border-theater-gold/15 border-t-theater-gold"
					aria-hidden="true"
				></span>
			{/if}
		</span>
		<span class={labelClasses[state]}>{label}</span>
	</span>
{/snippet}

<div class="mt-5 flex items-baseline gap-4 px-1" role="status">
	{#if demo}
		{@render indicator({ state: "ok", label: "Demo" })}
	{:else if connection.stream === "offline"}
		<!-- No connection indicator: there is nothing to connect to while offline. -->
		{@render indicator(streamIndicator)}
	{:else}
		{@render indicator(connectionIndicator)}
	{/if}
	{#if !demo && connection.stream !== "offline" && connectionIndicator.state === "ok"}
		<!-- Same baseline trick as the LED: an empty flex item's baseline is its bottom
		     edge, so a 0.75em rule stands exactly on the cap band. text-xs is not here
		     for text: it is the font-size that em resolves against. -->
		<span class="h-[0.75em] w-px bg-theater-border text-xs" aria-hidden="true"></span>
		{@render indicator(streamIndicator)}
	{/if}
</div>

<style>
	.status-live {
		animation: status-pulse 4s ease-in-out infinite;
	}

	@keyframes status-pulse {
		0%,
		100% {
			box-shadow: 0 0 4px currentColor;
		}
		50% {
			box-shadow: 0 0 7px currentColor;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.status-live {
			animation: none;
		}
	}
</style>
