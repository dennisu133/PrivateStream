<script lang="ts">
	import { Eye } from "@lucide/svelte";
	import type { IndicatorState, ReceivingState } from "$lib/types";

	type Indicator = { state: IndicatorState; label: string };

	// demo: a looping local file, so connection and stream state say nothing useful.
	let {
		demo = false,
		connection
	}: {
		demo?: boolean;
		connection: { state: RTCPeerConnectionState; stream: ReceivingState };
	} = $props();

	let viewers = $state<number | null>(null);

	$effect(() => {
		if (demo) return;
		let stopped = false;
		let timer: ReturnType<typeof setTimeout>;
		const controller = new AbortController();
		async function refresh() {
			try {
				const response = await fetch("/api/stream", {
					signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])
				});
				if (!response.ok) throw new Error("Status unavailable");
				const data = await response.json();
				if (!stopped)
					viewers = Number.isInteger(data.viewers) && data.viewers >= 0 ? data.viewers : null;
			} catch {
				if (!stopped) viewers = null;
			} finally {
				if (!stopped) timer = setTimeout(refresh, 3000);
			}
		}
		void refresh();
		return () => {
			stopped = true;
			controller.abort();
			clearTimeout(timer);
		};
	});

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
		ok: "status-live text-emerald-400",
		warn: "text-red-400",
		pending: "text-accent/25",
		off: "text-accent/25"
	};
	const labelClasses: Record<IndicatorState, string> = {
		ok: "text-emerald-400/85",
		warn: "text-red-400/85",
		pending: "text-muted",
		off: "text-muted"
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
		<!-- Geist Mono's rounded capitals span -16 to 726, with 1000 font units per em.
		     Include that overshoot and lower the circle's bottom just below the baseline. -->
		<span
			class="relative top-[0.016em] inline-block size-[0.742em] shrink-0 overflow-hidden rounded-full {ledClasses[
				state
			]}"
			aria-hidden="true"
		>
			<svg class="absolute inset-0 size-full" viewBox="0 0 742 742" fill="none">
				{#if state === "off" || state === "pending"}
					<circle cx="371" cy="371" r="329" stroke="currentColor" stroke-width="84" />
				{:else}
					<circle cx="371" cy="371" r="371" fill="currentColor" />
				{/if}
			</svg>
			{#if state === "pending"}
				<span
					class="absolute inset-0 m-auto size-1.5 animate-spin rounded-full border border-accent/15 border-t-accent"
					aria-hidden="true"
				></span>
			{/if}
		</span>
		<span class={labelClasses[state]}>{label}</span>
	</span>
{/snippet}

<div class="flex shrink-0 flex-wrap items-baseline gap-4 px-1">
	<div class="flex flex-wrap items-baseline gap-4" role="status">
		{#if demo}
			{@render indicator({ state: "ok", label: "Demo" })}
		{:else if connection.stream === "offline"}
			<!-- No connection indicator: there is nothing to connect to while offline. -->
			{@render indicator(streamIndicator)}
		{:else}
			{@render indicator(connectionIndicator)}
		{/if}
		{#if !demo && connection.stream !== "offline" && connectionIndicator.state === "ok"}
			<!-- Use the same font size and cap height as the indicators. -->
			<span class="h-[1cap] w-px bg-border text-xs" aria-hidden="true"></span>
			{@render indicator(streamIndicator)}
		{/if}
	</div>
	{#if !demo && connection.stream === "live"}
		<span
			class="inline-flex items-baseline gap-2 text-xs leading-none font-light tracking-widest text-muted uppercase"
			title="Active playback connections, including the plain player"
		>
			<span class="relative inline-block h-[1cap] w-3.5" aria-hidden="true">
				<Eye size={14} class="absolute top-1/2 -translate-y-1/2" />
			</span>
			{#if viewers === null}
				<span aria-hidden="true">— viewers</span>
				<span class="sr-only">Viewer count unavailable</span>
			{:else}
				<span>{viewers} {viewers === 1 ? "viewer" : "viewers"}</span>
			{/if}
		</span>
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
