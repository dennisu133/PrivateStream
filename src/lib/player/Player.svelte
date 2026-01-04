<script lang="ts">
	import { onMount } from "svelte";
	import PlayerButtons from "./PlayerButtons.svelte";
	import StatusIndicator from "./StatusIndicator.svelte";
	import { startWhep } from "./actions/whep";
	import { resizable } from "$lib/attachments/resizable.svelte";
	import {
		getConnectionIndicator,
		getStreamIndicator,
		type ConnectionState,
		type ReceivingState
	} from "$lib/types";
	import type { WhepController } from "./actions/whep";

	let { endpoint = "/api/whep", enableFunFeatures = true } = $props();

	let connectionState = $state<ConnectionState>("new");
	let streamStatus = $state<ReceivingState>("pending");

	let playerEl = $state<HTMLElement | null>(null);
	let frameEl = $state<HTMLDivElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let playerSize = $state({ width: 0, height: 0 });
	let controller: WhepController | null = null;

	const connectionIndicator = $derived(getConnectionIndicator(connectionState));
	const streamIndicator = $derived(getStreamIndicator(streamStatus));

	onMount(() => {
		if (endpoint && videoEl) {
			controller = startWhep(videoEl, {
				endpoint,
				onStateChange: (s) => (connectionState = s),
				onReceivingChange: (s) => (streamStatus = s)
			});
		}

		const target = frameEl ?? playerEl;
		let resizeObserver: ResizeObserver | null = null;

		if (target) {
			resizeObserver = new ResizeObserver(([entry]) => {
				if (!entry) return;
				const { width, height } = entry.contentRect;
				playerSize.width = Math.round(width);
				playerSize.height = Math.round(height);
			});
			resizeObserver.observe(target);
		}

		return () => {
			controller?.destroy();
			controller = null;
			resizeObserver?.disconnect();
		};
	});
</script>

<figure
	bind:this={playerEl}
	class="flex w-[70vw] flex-col gap-3 border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40"
	aria-label="Live stream player"
	aria-busy={streamStatus !== "live"}
	{@attach resizable()}
>
	<div class="relative aspect-video border border-white/10 bg-black" bind:this={frameEl}>
		<video bind:this={videoEl} aria-label="Video stream" autoplay muted playsinline>
			Your browser does not support video playback.
		</video>

		<PlayerButtons
			player={playerEl}
			frame={frameEl}
			video={videoEl}
			{playerSize}
			{enableFunFeatures}
		/>
	</div>

	<figcaption
		class="flex items-center gap-4 border border-white/15 bg-black/70 px-4 py-3 text-sm text-white/75"
		role="status"
		aria-live="polite"
		aria-atomic="true"
	>
		<StatusIndicator state={connectionIndicator.state} label={connectionIndicator.label} />
		{#if connectionIndicator.state === "ok"}
			<StatusIndicator state={streamIndicator.state} label={streamIndicator.label} />
		{/if}
	</figcaption>
</figure>
