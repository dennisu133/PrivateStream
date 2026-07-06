<script lang="ts">
	import { onMount } from "svelte";
	import PlayerButtons from "./PlayerButtons.svelte";
	import ReactionButton from "./reactions/ReactionButton.svelte";
	import ReactionSystem from "./reactions/ReactionSystem.svelte";
	import VolumeControls from "./controls/VolumeControls.svelte";
	import FullscreenToggle from "./controls/FullscreenToggle.svelte";
	import { startWhep } from "./actions/whep";
	import { resizable } from "$lib/attachments/resizable.svelte";
	import {
		getStreamStatus,
		setConnectionState,
		setStreamStatus
	} from "$lib/state/connection.svelte";
	import type { WhepController } from "./actions/whep";
	import poster from "$lib/assets/poster.webp";

	// When `demoSrc` is set the player loops a local video instead of starting
	// WHEP, so the page works without authentication (used by /demo).
	let { endpoint = "/api/whep", enableFunFeatures = true, demoSrc = null } = $props();

	let frameEl = $state<HTMLDivElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let controller: WhepController | null = null;

	let reactionSystem = $state<ReturnType<typeof ReactionSystem> | null>(null);

	const isLive = $derived(getStreamStatus() === "live");

	onMount(() => {
		if (!videoEl) return;

		if (demoSrc) {
			const video = videoEl;
			const handlePlaying = () => {
				setConnectionState("connected");
				setStreamStatus("live");
			};
			video.addEventListener("playing", handlePlaying);
			video.loop = true;
			video.src = demoSrc;

			return () => {
				video.removeEventListener("playing", handlePlaying);
				setConnectionState("new");
				setStreamStatus("pending");
			};
		}

		if (endpoint) {
			controller = startWhep(videoEl, {
				endpoint,
				onStateChange: (s) => setConnectionState(s),
				onReceivingChange: (s) => setStreamStatus(s)
			});
		}

		return () => {
			controller?.destroy();
			controller = null;
		};
	});
</script>

<svelte:head>
	<!-- The poster is the LCP element; `poster` can't carry fetchpriority, so preload it -->
	<link rel="preload" as="image" href={poster} fetchpriority="high" />
</svelte:head>

<!-- Cinema screen -->
<div
	class="relative w-[72vw] max-w-[min(90vw,calc((82vh-4rem)*16/9))] min-w-80 p-0 min-[448px]:p-3"
	aria-label="Live stream player"
	aria-busy={!isLive}
	{@attach resizable()}
>
	<!-- Ambient glow behind the screen -->
	<div
		class="pointer-events-none absolute -inset-8 -z-10 rounded-sm blur-3xl transition-opacity duration-1000"
		class:opacity-70={isLive}
		class:opacity-40={!isLive}
		style="background: radial-gradient(ellipse at center, oklch(0.4 0.08 250 / 0.3) 0%, oklch(0.28 0.06 250 / 0.1) 50%, transparent 75%);"
		aria-hidden="true"
	></div>

	<!-- Inner content - cursor reset to prevent resize cursor inheritance -->
	<div class="cursor-default">
		<!-- Top bezel -->
		<div
			class="h-[3px] w-full rounded-t-sm"
			style="background: linear-gradient(to right, transparent 5%, oklch(0.76 0.1 75 / 0.15) 20%, oklch(0.76 0.1 75 / 0.3) 50%, oklch(0.76 0.1 75 / 0.15) 80%, transparent 95%);"
			aria-hidden="true"
		></div>

		<!-- Video frame -->
		<div
			id="player-frame"
			class="@container-[size] relative aspect-video bg-black transition-shadow duration-700"
			style:box-shadow={isLive
				? "0 0 80px -10px oklch(0.4 0.08 250 / 0.35), 0 4px 40px -5px oklch(0 0 0 / 0.9)"
				: "0 0 60px -15px oklch(0.4 0.08 250 / 0.2), 0 4px 30px -5px oklch(0 0 0 / 0.8)"}
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
				<FullscreenToggle target={frameEl ?? videoEl} />
			</PlayerButtons>
		</div>

		<!-- Bottom bezel -->
		<div
			class="h-[3px] w-full rounded-b-sm"
			style="background: linear-gradient(to right, transparent 5%, oklch(0.76 0.1 75 / 0.1) 20%, oklch(0.76 0.1 75 / 0.2) 50%, oklch(0.76 0.1 75 / 0.1) 80%, transparent 95%);"
			aria-hidden="true"
		></div>
	</div>
</div>
