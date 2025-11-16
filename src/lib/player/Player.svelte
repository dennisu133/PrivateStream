<script lang="ts">
  import { onMount } from "svelte";
  import interact from "interactjs";
  import PlayerButtons from "./PlayerButtons.svelte";
  import { startWhep } from "./actions/whep";
  import type { WhepController, ReceivingState } from "./actions/whep";

  const DESKTOP_QUERY = "(min-width: 900px)";
  const ASPECT_RATIO = 16 / 9;
  const MIN_WIDTH = 480;
  const MAX_WIDTH = 1600;
  const VIEWPORT_PADDING = 48;

  let {
    endpoint = "/api/whep",
    enableFunFeatures = true,
  }: { endpoint?: string; enableFunFeatures?: boolean } = $props();
  let connectionState = $state<RTCPeerConnectionState>("new");
  let streamStatus = $state<ReceivingState>("pending");
  let isResizable = $state(false);
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

  onMount(() => {
    if (endpoint && videoEl) {
      controller = startWhep(videoEl, {
        endpoint,
        onStateChange: (s) => (connectionState = s),
        onReceivingChange: (r) => (streamStatus = r),
      });
    }

    let interactable: ReturnType<typeof interact> | null = null;
    let mediaQuery: MediaQueryList | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let observerRetry: number | null = null;

    const computeMaxWidth = () => {
      const viewport = window.innerWidth || MAX_WIDTH;
      const padded = Math.max(MIN_WIDTH, viewport - VIEWPORT_PADDING * 2);
      return Math.min(MAX_WIDTH, padded);
    };

    const clampWidth = (value: number) => {
      return Math.min(Math.max(value, MIN_WIDTH), computeMaxWidth());
    };

    const enforceBounds = () => {
      if (!playerEl || !isResizable) return;
      const next = clampWidth(playerEl.getBoundingClientRect().width);
      playerEl.style.width = `${next}px`;
    };

    const teardownResize = () => {
      if (interactable) {
        interactable.unset();
        interactable = null;
      }
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
      if (interactable) {
        enforceBounds();
        return;
      }
      interactable = interact(playerEl).resizable({
        edges: {
          top: ".player-edge-top",
          right: ".player-edge-right",
          bottom: ".player-edge-bottom",
          left: ".player-edge-left",
        },
        modifiers: [
          interact.modifiers.aspectRatio({
            ratio: ASPECT_RATIO,
            equalDelta: true,
          }),
        ],
        listeners: {
          move(event) {
            if (!playerEl) return;
            const width = clampWidth(event.rect.width);
            playerEl.style.width = `${width}px`;
          },
        },
      });
      window.addEventListener("resize", enforceBounds);
      window.addEventListener("orientationchange", enforceBounds);
      isResizable = true;
      enforceBounds();
    };

    if (typeof window !== "undefined") {
      mediaQuery = window.matchMedia(DESKTOP_QUERY);
      mediaQuery.addEventListener("change", setupResize);
      setupResize();
    }

    const attachObserver = () => {
      if (resizeObserver) return;
      const target = stageEl ?? playerEl;
      if (!target) {
        if (observerRetry !== null) cancelAnimationFrame(observerRetry);
        observerRetry = requestAnimationFrame(attachObserver);
        return;
      }
      if (observerRetry !== null) {
        cancelAnimationFrame(observerRetry);
        observerRetry = null;
      }
      resizeObserver = new ResizeObserver(([entry]) => {
        if (!entry) return;
        const { width, height } = entry.contentRect;
        playerSize.width = Math.round(width);
        playerSize.height = Math.round(height);
      });
      resizeObserver.observe(target);
    };

    attachObserver();

    return () => {
      controller?.destroy();
      controller = null;
      mediaQuery?.removeEventListener("change", setupResize);
      teardownResize();
      if (observerRetry !== null) {
        cancelAnimationFrame(observerRetry);
        observerRetry = null;
      }
      resizeObserver?.disconnect();
      resizeObserver = null;
    };
  });
</script>

<figure
  bind:this={playerEl}
  class="player"
  aria-label="Live stream player"
  aria-busy={streamStatus !== "live"}
  data-connected={connectionState === "connected"}
  data-resizable={isResizable}
>
  <div class="stage" bind:this={stageEl}>
    <video
      bind:this={videoEl}
      aria-label="Live video stream"
      autoplay
      muted
      playsinline
    >
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

  {#if isResizable}
    <div class="player-edge player-edge-top" aria-hidden="true"></div>
    <div class="player-edge player-edge-right" aria-hidden="true"></div>
    <div class="player-edge player-edge-bottom" aria-hidden="true"></div>
    <div class="player-edge player-edge-left" aria-hidden="true"></div>
  {/if}

  <figcaption
    id="player-status"
    class="status"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="item">
      <span
        class="status-dot"
        data-state={connectionIndicator.state}
        aria-hidden="true"
      >
        {#if connectionIndicator.state === "pending"}
          <span class="status-spinner" aria-hidden="true"></span>
        {/if}
      </span>
      <span>{connectionIndicator.label}</span>
    </span>
    {#if connectionIndicator.state === "ok"}
      <span class="item">
        <span
          class="status-dot"
          data-state={streamIndicator.state}
          aria-hidden="true"
        >
          {#if streamIndicator.state === "pending"}
            <span class="status-spinner" aria-hidden="true"></span>
          {/if}
        </span>
        <span>{streamIndicator.label}</span>
      </span>
    {/if}
  </figcaption>
</figure>

<style lang="postcss">
  @reference "tailwindcss";

  /* Root figure wrapper */
  .player {
    @apply relative
    z-10
    mx-4 my-4
    p-4
    gap-3
    flex
    flex-col
    w-full
    border border-white/10
    bg-white/5
    shadow-2xl
    shadow-black/40
    backdrop-blur-md;
    --player-max-width: clamp(480px, calc(100vw - 96px), 1600px);
    inline-size: min(100%, var(--player-max-width), 960px);
    max-inline-size: var(--player-max-width);
  }

  .player[data-resizable="true"] {
    @apply max-w-none transition-[width] duration-150 ease-out;
  }

  .player[data-resizable="true"] .stage,
  .player[data-resizable="true"] .status {
    @apply transition-[width] duration-150 ease-out;
  }

  /* Video stage */
  .player .stage {
    @apply relative
    aspect-video
    w-full
    overflow-hidden
    border border-white/15
    bg-black;
  }

  .player .stage:fullscreen {
    @apply border-0 outline-hidden;
  }

  .player .stage video {
    @apply h-full w-full object-contain;
  }

  /* Resizable edges */
  .player-edge {
    @apply absolute bg-transparent;
    pointer-events: auto;
  }

  .player-edge-top,
  .player-edge-bottom {
    @apply left-0 right-0 h-4 cursor-ns-resize;
  }

  .player-edge-top {
    @apply top-0;
  }

  .player-edge-bottom {
    @apply bottom-0;
  }

  .player-edge-left,
  .player-edge-right {
    @apply top-4 bottom-4 w-4 cursor-ew-resize;
  }

  .player-edge-left {
    @apply left-0;
  }

  .player-edge-right {
    @apply right-0;
  }

  /* Status text */
  .player .status {
    @apply flex
    items-center
    px-4 py-3
    gap-4
    border border-white/15
    bg-black/70
    text-sm text-white/75;
  }

  .player .status .item {
    @apply inline-flex items-center gap-2 uppercase tracking-wide font-semibold;
  }

  /* Status dots */
  .player .status-dot {
    @apply h-2.5 w-2.5 rounded-full inline-flex items-center justify-center;
  }

  .player .status-dot[data-state="ok"] {
    @apply bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)];
  }

  .player .status-dot[data-state="warn"] {
    @apply bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.8)];
  }

  .player .status-dot[data-state="pending"] {
    @apply border border-white/30 bg-transparent;
  }

  .player .status-spinner {
    @apply h-2 w-2 rounded-full border border-white/20 border-t-white animate-spin;
  }

  /* Horizontal phone layout */
  @media (orientation: landscape) and (max-height: 480px) {
    .player {
      @apply flex-row z-0 mx-0 max-h-screen;
    }
    .player .status {
      @apply flex-col self-stretch h-full items-start;
    }
  }
</style>
