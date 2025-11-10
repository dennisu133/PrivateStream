<!-- Custom video player -->

<script module lang="ts">
  export const HIDE_DELAY_MS = 2000;
  export const VOLUME_STEP = 0.05;
  export const DEFAULT_UNMUTE_VOLUME = 0.5;
  export const ASPECT_RATIO = 16 / 9;
</script>

<script lang="ts">
  import interact from "interactjs";
  import Reaction from "./Reaction.svelte";
  import ReactionButton from "./ReactionButton.svelte";
  import { whep } from "$lib/actions/whep";
  import type { ResizeEvent } from "@interactjs/types";
  import {
    Volume,
    Volume2,
    Volume1,
    VolumeX,
    Maximize,
    Minimize,
  } from "@lucide/svelte";

  let {
    videoEl = $bindable<HTMLVideoElement | null>(),
    enableJokeFeatures = true,
    streamEndpoint = "/api/whep",
  } = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let volume = $state(0);
  let isMuted = $state(true);
  let isFullscreen = $state(false);
  let controlsVisible = $state(true);
  let isPointerOverControls = $state(false);
  let lastNonZeroVolume = $state(0.5);
  let hideTimer: number | undefined;

  function getOuterRect() {
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }

  function clearHideTimer() {
    if (hideTimer !== undefined) {
      window.clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      if (!isPointerOverControls) {
        controlsVisible = false;
      }
      hideTimer = undefined;
    }, HIDE_DELAY_MS);
  }

  function showControlsTemporarily() {
    controlsVisible = true;
    scheduleHide();
  }

  function clamp01(n: number) {
    return Math.min(1, Math.max(0, n));
  }

  function setVolumeNormalized(next: number) {
    const wasMuted = isMuted;
    const clamped = clamp01(next);
    volume = clamped;
    if (clamped === 0) {
      isMuted = true;
      try {
        if (videoEl) videoEl.muted = true;
      } catch {}
    } else {
      if (isMuted) isMuted = false;
      lastNonZeroVolume = clamped;
      if (wasMuted) {
        try {
          if (videoEl) {
            videoEl.muted = false;
            const p = videoEl.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        } catch {}
      }
    }
  }

  $effect(() => {
    if (!videoEl) return;
    videoEl.volume = volume;
    videoEl.muted = isMuted;
  });

  function toggleMute() {
    const video = videoEl;
    if (isMuted) {
      const restored =
        lastNonZeroVolume > 0 ? lastNonZeroVolume : DEFAULT_UNMUTE_VOLUME;
      setVolumeNormalized(restored);
      try {
        if (video) {
          video.muted = false;
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      } catch {}
    } else {
      if (volume > 0) lastNonZeroVolume = volume;
      setVolumeNormalized(0);
    }
    showControlsTemporarily();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const target = containerEl;
        if (!target) return;
        await target.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      showControlsTemporarily();
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  }

  function onSliderWrite(next: unknown) {
    const n = Number(next);
    if (!Number.isNaN(n)) setVolumeNormalized(n);
    showControlsTemporarily();
  }

  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
    showControlsTemporarily();
  }

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target) {
      const tag = (target.tagName || "").toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (target as HTMLElement).isContentEditable
      ) {
        return;
      }
    }
    const actions: Record<string, () => void> = {
      ArrowUp: () => {
        setVolumeNormalized(volume + VOLUME_STEP);
        showControlsTemporarily();
      },
      ArrowDown: () => {
        setVolumeNormalized(volume - VOLUME_STEP);
        showControlsTemporarily();
      },
      m: toggleMute,
      M: toggleMute,
      f: toggleFullscreen,
      F: toggleFullscreen,
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  // Pointer activity within the player keeps controls visible

  // Hovering controls prevents auto-hide; leaving reschedules hide
  function onControlsEnter() {
    isPointerOverControls = true;
    controlsVisible = true;
    clearHideTimer();
  }
  function onControlsLeave() {
    isPointerOverControls = false;
    scheduleHide();
  }

  // Resizing logic
  $effect(() => {
    const el = containerEl;
    if (!el) return;

    const MAX_MARGIN_FACTOR = 0.9;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      return;
    }
    const interactable = interact(el);

    function computeConstraints() {
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;

      // Leave a margin so the player doesn't scale to near-full window
      const usableWidth = availableWidth * MAX_MARGIN_FACTOR;
      const usableHeight = availableHeight * MAX_MARGIN_FACTOR;

      // Respect both width and height limits while keeping 16:9
      const widthFromHeight = usableHeight * ASPECT_RATIO;
      const maxWidth = Math.floor(Math.min(usableWidth, widthFromHeight));
      const maxHeight = Math.floor(maxWidth / ASPECT_RATIO);

      const minWidth = Math.min(320, maxWidth);
      const minHeight = Math.floor(minWidth / ASPECT_RATIO);

      return {
        min: { width: minWidth, height: minHeight },
        max: { width: maxWidth, height: maxHeight },
      };
    }

    function applyResizable(init: boolean) {
      const { min, max } = computeConstraints();
      const outerRect = getOuterRect();
      interactable.resizable({
        ...(init
          ? {
              edges: { top: true, left: true, bottom: true, right: true },
              listeners: {
                move(event: ResizeEvent) {
                  const target = event.target as HTMLElement;
                  const width = Math.round(event.rect.width);
                  const height = Math.round(width / ASPECT_RATIO);
                  target.style.width = `${width}px`;
                  target.style.height = `${height}px`;
                },
              },
              inertia: true,
            }
          : {}),
        modifiers: [
          interact.modifiers.aspectRatio({ ratio: ASPECT_RATIO }),
          interact.modifiers.restrictEdges({ outer: outerRect }),
          interact.modifiers.restrictSize({ min, max }),
        ],
      });
    }

    // Initial setup with listeners
    applyResizable(true);

    // Re-apply constraints on viewport or parent changes (throttled)
    let raf = 0;
    const scheduleReapply = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        applyResizable(false);
      });
    };
    window.addEventListener("resize", scheduleReapply);
    window.addEventListener("orientationchange", scheduleReapply);

    const parentEl = el.parentElement as HTMLElement | null;
    let resizeObserver: ResizeObserver | undefined;
    if (parentEl) {
      resizeObserver = new ResizeObserver(() => scheduleReapply());
      resizeObserver.observe(parentEl);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleReapply);
      window.removeEventListener("orientationchange", scheduleReapply);
      if (raf) cancelAnimationFrame(raf);
      interactable.unset();
    };
  });

  // clear pending hide timer on unmount
  $effect(() => {
    return () => {
      if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    };
  });
</script>

<svelte:document onfullscreenchange={onFullscreenChange} />
<svelte:window onkeydown={onKeydown} />

<div
  bind:this={containerEl}
  class="player-root"
  class:hide-cursor={isFullscreen && !controlsVisible}
  onpointermove={showControlsTemporarily}
  onpointerdown={showControlsTemporarily}
>
  <video
    bind:this={videoEl}
    autoplay
    playsinline
    muted
    use:whep={{ endpoint: streamEndpoint }}
    style="width: 100%; height: 100%; display: block;"
  ></video>

  <div class="controls" class:visible={controlsVisible} onpointerenter={onControlsEnter} onpointerleave={onControlsLeave}>
    {#if enableJokeFeatures}
      <ReactionButton />
    {/if}
    <button
      type="button"
      class="icon-btn"
      aria-label={isMuted ? "Unmute" : "Mute"}
      title={(isMuted ? "Unmute" : "Mute") + " (m, ↑/↓)"}
      onclick={toggleMute}
      aria-pressed={isMuted}
    >
      {#if isMuted}
        <VolumeX size={24} strokeWidth={2} aria-hidden="true" />
      {:else if volume < 0.33}
        <Volume size={24} strokeWidth={2} aria-hidden="true" />
      {:else if volume < 0.66}
        <Volume1 size={24} strokeWidth={2} aria-hidden="true" />
      {:else}
        <Volume2 size={24} strokeWidth={2} aria-hidden="true" />
      {/if}
    </button>

    <input
      class="volume-slider"
      type="range"
      min="0"
      max="1"
      step="0.05"
      bind:value={() => volume, onSliderWrite}
      aria-label="Volume"
      aria-valuemin="0"
      aria-valuemax="1"
      aria-valuenow={volume}
    />

    <button
      type="button"
      class="icon-btn"
      aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
      title={(isFullscreen ? "Exit full screen" : "Full screen") + " (f)"}
      onclick={toggleFullscreen}
    >
      {#if !isFullscreen}
        <Maximize size={24} strokeWidth={2} aria-hidden="true" />
      {:else}
        <Minimize size={24} strokeWidth={2} aria-hidden="true" />
      {/if}
    </button>
  </div>

  {#if enableJokeFeatures}
    <Reaction {containerEl} />
  {/if}
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .player-root {
    @apply relative 
    w-[min(60vw,calc(60vh*16/9))] h-[calc(min(60vw,60vh*16/9)/(16/9))] 
    max-w-[90vw] max-h-[90vh]
    aspect-video 
    border-2 border-neutral-800 
    bg-black shadow-[0_0_15px_rgba(0,0,0,0.5)]
    touch-none 
    box-border 
    z-2 
    overflow-hidden;
  }

  /* Remove border during native fullscreen */
  .player-root:fullscreen {
    @apply border-0;
  }

  @media (max-width: 600px) {
    .player-root {
      @apply w-[min(90vw,calc(90vh*16/9))] h-[calc(min(90vw,90vh*16/9)/(16/9))];
    }
  }

  .controls {
    @apply absolute 
    right-[10px] bottom-[10px] 
    flex 
    items-center 
    gap-[10px]
    bg-black/35 
    backdrop-blur-[2px] 
    rounded-lg 
    px-2 py-1.5 
    opacity-0 
    invisible 
    translate-y-[6px]
    transition-all duration-200 ease-in-out 
    z-10 
    isolate;
  }

  .controls.visible {
    @apply opacity-100 visible translate-y-0;
  }

  .icon-btn {
    @apply bg-transparent 
    border-0 
    text-white 
    w-8 h-8 
    grid 
    place-items-center 
    cursor-pointer 
    rounded-[6px]
    hover:bg-white/10;
  }

  .volume-slider {
    @apply w-[120px] accent-white;
  }

  .player-root.hide-cursor,
  .player-root.hide-cursor * {
    @apply cursor-none;
  }
</style>
