<script lang="ts">
	import { onMount } from "svelte";
	import PlayerButtons from "./PlayerButtons.svelte";
	import StatusIndicator from "./StatusIndicator.svelte";
	import ReactionButton from "./reactions/ReactionButton.svelte";
	import ReactionSystem from "./reactions/ReactionSystem.svelte";
	import VolumeControls from "./controls/VolumeControls.svelte";
	import FullscreenToggle from "./controls/FullscreenToggle.svelte";
	import { startWhep } from "./actions/whep";
	import { resizable } from "$lib/attachments/resizable.svelte";
	import {
		getConnectionIndicator,
		getStreamIndicator,
		type ConnectionState,
		type ReceivingState
	} from "$lib/types";
	import type { WhepController } from "./actions/whep";
	import poster from "$lib/assets/poster.webp";

	let { endpoint = "/api/whep", enableFunFeatures = true } = $props();

	let connectionState = $state<ConnectionState>("new");
	let streamStatus = $state<ReceivingState>("pending");

	let playerEl = $state<HTMLElement | null>(null);
	let frameEl = $state<HTMLDivElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let controller: WhepController | null = null;

	let reactionSystem = $state<ReturnType<typeof ReactionSystem> | null>(null);

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

		return () => {
			controller?.destroy();
			controller = null;
		};
	});
</script>

<figure
	bind:this={playerEl}
	class="flex w-[70vw] max-w-[min(90vw,calc((90vh-6rem)*16/9))] min-w-[350px] flex-col gap-3 border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40"
	aria-label="Live stream player"
	aria-busy={streamStatus !== "live"}
	{@attach resizable()}
>
	<div
		id="player-frame"
		class="@container-[size] relative aspect-video border border-white/10 bg-black"
		bind:this={frameEl}
	>
		<video
			bind:this={videoEl}
			aria-label="Video stream"
			{poster}
			autoplay
			muted
			playsinline
			class="aspect-video h-full w-full"
		>
			Your browser does not support video playback.
		</video>

		{#if enableFunFeatures}
			<ReactionSystem bind:this={reactionSystem} {frameEl} />
		{/if}

		<PlayerButtons frame={frameEl}>
			{#if enableFunFeatures && reactionSystem}
				<ReactionButton
					isOpen={reactionSystem.isOpen()}
					onToggle={() => reactionSystem?.toggle()}
					onInteract={() => reactionSystem?.interact()}
					onMount={(el) => reactionSystem?.setToggleButtonEl(el)}
				/>
			{/if}

			<VolumeControls video={videoEl} disableGlobalInput={reactionSystem?.isOpen() ?? false} />
			<FullscreenToggle target={frameEl ?? videoEl ?? playerEl} />
		</PlayerButtons>
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
