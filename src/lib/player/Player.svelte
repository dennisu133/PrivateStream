<script lang="ts">
	import { onMount } from "svelte";
	import PlayerControls from "./PlayerControls.svelte";
	import { startWhep } from "./actions/whep";
	import { resizable } from "$lib/attachments/resizable";
	import FrameBrackets from "$lib/components/FrameBrackets.svelte";
	import StatusBar from "$lib/components/StatusBar.svelte";
	import { connection } from "$lib/state/connection.svelte";
	import poster from "$lib/assets/poster.webp";

	// demoSrc switches the player from WHEP to a looping local video.
	let {
		enableFunFeatures = true,
		demoSrc = null
	}: {
		enableFunFeatures?: boolean;
		demoSrc?: string | null;
	} = $props();

	let frameEl = $state<HTMLDivElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);

	const isLive = $derived(connection.stream === "live");

	onMount(() => {
		if (!videoEl) return;
		const video = videoEl;

		// connection is a shared singleton, so both paths hand it back as they found it.
		const reset = () => {
			connection.state = "new";
			connection.stream = "pending";
		};

		if (demoSrc) {
			const handlePlaying = () => {
				connection.state = "connected";
				connection.stream = "live";
			};
			video.addEventListener("playing", handlePlaying);

			return () => {
				video.removeEventListener("playing", handlePlaying);
				reset();
			};
		}

		const controller = startWhep(video, {
			onStateChange: (state) => (connection.state = state),
			onReceivingChange: (state) => (connection.stream = state)
		});

		return () => {
			controller.destroy();
			reset();
		};
	});
</script>

<svelte:head>
	{#if !demoSrc}
		<!-- The poster is the LCP image, and the video poster attribute cannot set fetchpriority. -->
		<link rel="preload" as="image" href={poster} fetchpriority="high" />
	{/if}
</svelte:head>

<!-- Width is 72vw, capped so the 16:9 frame plus its chrome still fits in 82vh, and
     floored at 20rem. The p-3 gutter above 448px doubles as the resize handle ring,
     which is why resizable.ts only enables dragging well above that breakpoint. -->
<div
	class="relative w-[72vw] max-w-[min(90vw,calc((82vh-4rem)*16/9))] min-w-80 p-0 transition-[--edge] duration-700 ease-cinema min-[448px]:p-3"
	style:--edge={isLive ? 0.55 : 0.22}
	role="region"
	aria-label="Live stream player"
	aria-busy={!isLive}
	{@attach resizable({ surfaceSelector: "[data-resize-surface]" })}
>
	<!-- The status bar follows this surface's width without affecting its aspect ratio. -->
	<div data-resize-surface class="relative cursor-default">
		<div class="h-px frame-edge" aria-hidden="true"></div>

		<div
			class="@container-size relative aspect-video bg-theater-black ring-1 ring-theater-gold/10 ring-inset"
			bind:this={frameEl}
		>
			<!-- Keep demoSrc in SSR markup so the browser can fetch it before hydration. -->
			<video
				bind:this={videoEl}
				aria-label="Video stream"
				poster={demoSrc ? undefined : poster}
				src={demoSrc ?? undefined}
				loop={Boolean(demoSrc)}
				autoplay
				muted
				playsinline
				class="size-full"
			>
				Your browser does not support video playback.
			</video>

			<PlayerControls frame={frameEl} video={videoEl} enableReactions={enableFunFeatures} />
		</div>

		<div class="h-px frame-edge" style:--edge-scale="0.66" aria-hidden="true"></div>

		<FrameBrackets />
	</div>

	<div class="cursor-default">
		<StatusBar />
	</div>
</div>
