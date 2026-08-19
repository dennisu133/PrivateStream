<script lang="ts">
	import { onMount } from "svelte";
	import PlayerControls from "./PlayerControls.svelte";
	import { startWhep } from "./actions/whep";
	import { resizable } from "$lib/attachments/resizable.svelte";
	import FrameBrackets from "$lib/components/FrameBrackets.svelte";
	import StatusBar from "$lib/components/StatusBar.svelte";
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
	{#if !demoSrc}
		<!-- The poster is the LCP element; `poster` can't carry fetchpriority, so preload it -->
		<link rel="preload" as="image" href={poster} fetchpriority="high" />
	{/if}
</svelte:head>

<!-- Cinema screen -->
<div
	class="relative w-[72vw] max-w-[min(90vw,calc((82vh-4rem)*16/9))] min-w-80 p-0 transition-[--edge] duration-700 ease-cinema min-[448px]:p-3"
	style:--edge={isLive ? 0.55 : 0.22}
	aria-label="Live stream player"
	aria-busy={!isLive}
	{@attach resizable({ surfaceSelector: "[data-resize-surface]" })}
>
	<!-- Inner content - cursor reset to prevent resize cursor inheritance. This
	     wrapper is exactly the rules + frame, because it's what the brackets
	     anchor to; the status line below sits outside it. -->
	<div data-resize-surface class="relative cursor-default">
		<!-- Letterbox rule. 1px tall, so its horizontal fade spans far too little
		     area to quantise into bands. -->
		<div
			class="h-px w-full"
			style="background: linear-gradient(to right, transparent 4%, oklch(0.76 0.1 75 / var(--edge)) 22%, oklch(0.76 0.1 75 / var(--edge)) 78%, transparent 96%);"
			aria-hidden="true"
		></div>

		<!-- Video frame. No drop shadow: over a true-black room a black shadow is
		     literally invisible, and a coloured one is what was banding. The frame
		     is defined by its hairline instead. -->
		<div
			id="player-frame"
			class="@container-size relative aspect-video bg-black ring-1 ring-theater-gold/10 ring-inset"
			bind:this={frameEl}
		>
			<!-- Demo src/loop live in the markup (not onMount) so the SSR HTML carries
			     the src and the browser starts fetching before hydration (LCP) -->
			<video
				bind:this={videoEl}
				aria-label="Video stream"
				poster={demoSrc ? undefined : poster}
				src={demoSrc ?? undefined}
				loop={Boolean(demoSrc)}
				autoplay
				muted
				playsinline
				class="aspect-video h-full w-full"
			>
				Your browser does not support video playback.
			</video>

			<PlayerControls frame={frameEl} video={videoEl} enableReactions={enableFunFeatures} />
		</div>

		<!-- Bottom rule, carried at two thirds the top's weight so the frame reads
		     lit from above -->
		<div
			class="h-px w-full"
			style="background: linear-gradient(to right, transparent 4%, oklch(0.76 0.1 75 / calc(var(--edge) * 0.66)) 22%, oklch(0.76 0.1 75 / calc(var(--edge) * 0.66)) 78%, transparent 96%);"
			aria-hidden="true"
		></div>

		<FrameBrackets />
	</div>

	<!-- The status line is a gate label on the frame, not page chrome: it now
	     tracks the player when it's resized, and needs no box of its own because
	     the frame above already separates it from the room. It sits inside the
	     resizable element but is not part of the resize surface, hence the
	     marker; the cursor reset keeps the resize cursor off it. -->
	<div class="cursor-default">
		<StatusBar />
	</div>
</div>
