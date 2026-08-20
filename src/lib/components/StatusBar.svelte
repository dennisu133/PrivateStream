<script lang="ts">
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

	// Exactly one colour class per element. Stacking a base colour with a state
	// override lets whichever Tailwind emits last win, not whichever is written last.
	const ledClasses: Record<IndicatorState, string> = {
		// text-* here is not for text: currentColor feeds the status-pulse box-shadow.
		ok: "status-live bg-emerald-400 text-emerald-400",
		warn: "bg-red-400",
		pending: "border border-theater-gold/25 bg-transparent"
	};
	const labelClasses: Record<IndicatorState, string> = {
		ok: "text-emerald-400/85",
		warn: "text-red-400/85",
		pending: "text-theater-muted"
	};

	const connectionIndicator: Indicator = $derived(
		connectionIndicators[connection.state] ?? { state: "pending", label: "Connecting..." }
	);
	const streamIndicator = $derived(streamIndicators[connection.stream]);
</script>

{#snippet indicator({ state, label }: Indicator)}
	<span
		class="inline-flex items-start gap-2.5 text-xs leading-none font-light tracking-widest uppercase"
	>
		<!-- Puts the LED's top edge on the first line's cap height: half-leading,
		     (1lh - 1.333em) / 2, plus ascent - cap, 0.25em. Metrics in app.css. -->
		<span
			class="mt-[calc((1lh-1.333em)/2+0.25em)] inline-flex size-[0.75em] shrink-0 items-center justify-center rounded-full {ledClasses[
				state
			]}"
			aria-hidden="true"
		>
			{#if state === "pending"}
				<span
					class="size-1.5 animate-spin rounded-full border border-theater-gold/15 border-t-theater-gold"
					aria-hidden="true"
				></span>
			{/if}
		</span>
		<span class={labelClasses[state]}>{label}</span>
	</span>
{/snippet}

<div class="mt-5 flex items-center gap-4 px-1" role="status">
	{@render indicator(connectionIndicator)}
	{#if connectionIndicator.state === "ok"}
		<!-- Divider spans one cap height (0.75em). items-center would seat it at
		     (1lh - 0.75em) / 2 = 0.125em, while the cap starts at 0.0833em, hence the
		     0.042em lift. text-xs is not here for text: it is the font-size those em
		     units resolve against. Metrics in app.css. -->
		<span
			class="h-[0.75em] w-px translate-y-[-0.042em] bg-theater-border text-xs"
			aria-hidden="true"
		></span>
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
