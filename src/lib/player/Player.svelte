<script lang="ts">
	import { onMount } from "svelte";
	import PlayerButtons from "./PlayerButtons.svelte";
	import { startWhep } from "./actions/whep";
	import type { WhepController, ReceivingState } from "./actions/whep";

	const DESKTOP_QUERY = "(min-width: 900px)";
	const ASPECT_RATIO = 16 / 9;
	const MIN_WIDTH = 480;
	const MAX_WIDTH = 1600;
	const VIEWPORT_PADDING = 48;
	const PLAYER_CHROME_HEIGHT = 100; // padding + gap + status bar

	let {
		endpoint = "/api/whep",
		enableFunFeatures = true
	}: { endpoint?: string; enableFunFeatures?: boolean } = $props();
	let connectionState = $state<RTCPeerConnectionState>("new");
	let streamStatus = $state<ReceivingState>("pending");
	let isResizable = $state(false);
	let isResizing = $state(false);
	let playerEl = $state<HTMLElement | null>(null);
	let stageEl = $state<HTMLDivElement | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let playerSize = $state({ width: 0, height: 0 });
	let controller: WhepController | null = null;
	const connectionIndicator = $derived.by(() => {
		switch (connectionState) {
			case "connected":
				return { state: "ok" as const, label: "Connected" };
			case "failed":
				return { state: "warn" as const, label: "Failed" };
			case "disconnected":
				return { state: "warn" as const, label: "Disconnected" };
			case "closed":
				return { state: "warn" as const, label: "Closed" };
			default:
				return { state: "pending" as const, label: "Connecting..." };
		}
	});
	const streamIndicator = $derived.by(() => {
		if (streamStatus === "live") {
			return { state: "ok" as const, label: "Live" };
		}
		if (streamStatus === "idle") {
			return { state: "warn" as const, label: "No Stream" };
		}
		return { state: "pending" as const, label: "Checking..." };
	});

	// Resize state
	type Edge =
		| "top"
		| "right"
		| "bottom"
		| "left"
		| "top-left"
		| "top-right"
		| "bottom-left"
		| "bottom-right"
		| null;
	const EDGE_THRESHOLD = 12; // pixels from edge to trigger resize

	let activeEdge = $state<Edge>(null);
	let hoverEdge = $state<Edge>(null);
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartWidth = 0;

	const isFullscreen = () => document.fullscreenElement != null;

	const getEdgeFromPosition = (e: PointerEvent): Edge => {
		if (!playerEl) return null;
		const rect = playerEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const nearTop = y < EDGE_THRESHOLD;
		const nearBottom = y > rect.height - EDGE_THRESHOLD;
		const nearLeft = x < EDGE_THRESHOLD;
		const nearRight = x > rect.width - EDGE_THRESHOLD;

		// Corner detection
		if (nearTop && nearLeft) return "top-left";
		if (nearTop && nearRight) return "top-right";
		if (nearBottom && nearLeft) return "bottom-left";
		if (nearBottom && nearRight) return "bottom-right";

		// Edge detection
		if (nearTop) return "top";
		if (nearBottom) return "bottom";
		if (nearLeft) return "left";
		if (nearRight) return "right";

		return null;
	};

	const getCursorForEdge = (edge: Edge): string => {
		switch (edge) {
			case "top":
			case "bottom":
				return "ns-resize";
			case "left":
			case "right":
				return "ew-resize";
			case "top-left":
			case "bottom-right":
				return "nwse-resize";
			case "top-right":
			case "bottom-left":
				return "nesw-resize";
			default:
				return "default";
		}
	};

	const computeMaxWidth = () => {
		const vw = window.innerWidth || MAX_WIDTH;
		const vh = window.innerHeight || MAX_WIDTH / ASPECT_RATIO;
		const maxFromWidth = Math.max(MIN_WIDTH, vw - VIEWPORT_PADDING * 2);
		const availableHeight = vh - VIEWPORT_PADDING * 2 - PLAYER_CHROME_HEIGHT;
		const maxFromHeight = availableHeight * ASPECT_RATIO;
		return Math.min(MAX_WIDTH, maxFromWidth, maxFromHeight);
	};

	const clampWidth = (value: number) => {
		return Math.min(Math.max(value, MIN_WIDTH), computeMaxWidth());
	};

	const enforceBounds = () => {
		if (!playerEl || !isResizable) return;
		const next = clampWidth(playerEl.getBoundingClientRect().width);
		playerEl.style.width = `${next}px`;
	};

	const handlePlayerPointerDown = (e: PointerEvent) => {
		if (!playerEl || !isResizable || isFullscreen()) return;
		// Only handle direct interactions on the player, not bubbled events from children
		if (e.target !== playerEl) return;
		const edge = getEdgeFromPosition(e);
		if (!edge) return;

		e.preventDefault();
		activeEdge = edge;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragStartWidth = playerEl.getBoundingClientRect().width;
		isResizing = true;
		playerEl.setPointerCapture(e.pointerId);
	};

	const handlePlayerPointerMove = (e: PointerEvent) => {
		if (!playerEl || !isResizable || isFullscreen()) return;

		// If actively resizing, calculate new size
		if (activeEdge) {
			e.preventDefault();
			const deltaX = e.clientX - dragStartX;
			const deltaY = e.clientY - dragStartY;

			let newWidth: number;

			switch (activeEdge) {
				case "right":
				case "top-right":
				case "bottom-right":
					newWidth = dragStartWidth + deltaX;
					break;
				case "left":
				case "top-left":
				case "bottom-left":
					newWidth = dragStartWidth - deltaX;
					break;
				case "bottom":
					newWidth = dragStartWidth + deltaY * ASPECT_RATIO;
					break;
				case "top":
					newWidth = dragStartWidth - deltaY * ASPECT_RATIO;
					break;
				default:
					return;
			}

			playerEl.style.width = `${clampWidth(newWidth)}px`;
		} else {
			// Update hover cursor only when directly over the player element
			if (e.target === playerEl) {
				hoverEdge = getEdgeFromPosition(e);
			} else {
				hoverEdge = null;
			}
		}
	};

	const handlePlayerPointerUp = (e: PointerEvent) => {
		if (!activeEdge || !playerEl) return;
		playerEl.releasePointerCapture(e.pointerId);
		activeEdge = null;
		isResizing = false;
	};

	const handlePlayerPointerLeave = () => {
		if (!activeEdge) {
			hoverEdge = null;
		}
	};

	onMount(() => {
		if (endpoint && videoEl) {
			controller = startWhep(videoEl, {
				endpoint,
				onStateChange: (s) => (connectionState = s),
				onReceivingChange: (r) => (streamStatus = r)
			});
		}

		let mediaQuery: MediaQueryList | null = null;
		let resizeObserver: ResizeObserver | null = null;

		const teardownResize = () => {
			window.removeEventListener("resize", enforceBounds);
			window.removeEventListener("orientationchange", enforceBounds);
			if (playerEl) {
				playerEl.style.removeProperty("width");
			}
			isResizable = false;
		};

		const setupResize = () => {
			if (!playerEl || !mediaQuery) return;
			if (!mediaQuery.matches) {
				teardownResize();
				return;
			}
			if (isResizable) {
				enforceBounds();
				return;
			}
			window.addEventListener("resize", enforceBounds);
			window.addEventListener("orientationchange", enforceBounds);
			isResizable = true;
			enforceBounds();
		};

		mediaQuery = window.matchMedia(DESKTOP_QUERY);
		mediaQuery.addEventListener("change", setupResize);
		setupResize();

		const target = stageEl ?? playerEl;
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
			mediaQuery?.removeEventListener("change", setupResize);
			teardownResize();
			resizeObserver?.disconnect();
			resizeObserver = null;
		};
	});
</script>

<figure
	bind:this={playerEl}
	class="player flex flex-col gap-3 border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur-md"
	class:touch-none={isResizable}
	style:cursor={isResizable ? getCursorForEdge(hoverEdge) : undefined}
	aria-label="Live stream player"
	aria-busy={streamStatus !== "live"}
	data-resizable={isResizable}
	data-resizing={isResizing}
	onpointerdown={handlePlayerPointerDown}
	onpointermove={handlePlayerPointerMove}
	onpointerup={handlePlayerPointerUp}
	onpointercancel={handlePlayerPointerUp}
	onpointerleave={handlePlayerPointerLeave}
>
	<div class="relative aspect-video border border-white/10 bg-black" bind:this={stageEl}>
		<video bind:this={videoEl} aria-label="Video stream" autoplay muted playsinline>
			Your browser does not support video playback.
		</video>

		<PlayerButtons
			player={playerEl}
			stage={stageEl}
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
		<span class="inline-flex items-center gap-2 font-semibold tracking-wide uppercase">
			<span
				class="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full
					{connectionIndicator.state === 'ok'
					? 'bg-green-400 shadow-[0_0_8px_var(--color-green-400)]'
					: connectionIndicator.state === 'warn'
						? 'bg-red-500 shadow-[0_0_8px_var(--color-red-500)]'
						: 'border border-white/30 bg-transparent'}"
				aria-hidden="true"
			>
				{#if connectionIndicator.state === "pending"}
					<span
						class="h-2 w-2 animate-spin rounded-full border border-white/20 border-t-white"
						aria-hidden="true"
					></span>
				{/if}
			</span>
			<span>{connectionIndicator.label}</span>
		</span>
		{#if connectionIndicator.state === "ok"}
			<span class="inline-flex items-center gap-2 font-semibold tracking-wide uppercase">
				<span
					class="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full
						{streamIndicator.state === 'ok'
						? 'bg-green-400 shadow-[0_0_8px_var(--color-green-400)]'
						: streamIndicator.state === 'warn'
							? 'bg-red-500 shadow-[0_0_8px_var(--color-red-500)]'
							: 'border border-white/30 bg-transparent'}"
					aria-hidden="true"
				>
					{#if streamIndicator.state === "pending"}
						<span
							class="h-2 w-2 animate-spin rounded-full border border-white/20 border-t-white"
							aria-hidden="true"
						></span>
					{/if}
				</span>
				<span>{streamIndicator.label}</span>
			</span>
		{/if}
	</figcaption>
</figure>

<!-- /* Horizontal phone layout
@media (orientation: landscape) and (max-height: 480px) {
  .player {
    @apply z-0 mx-0 max-h-screen flex-row;
  }
  .player .status {
    @apply h-full flex-col items-start self-stretch;
  }
} -->
