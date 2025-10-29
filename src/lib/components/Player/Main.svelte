<!-- Custom video player -->

<script lang="ts">
  import interact from "interactjs";
  import Catstare from "./Catstare.svelte";
  import { whep } from "$lib/actions/whep";
  import type { ResizeEvent } from "@interactjs/types";

  let {
    videoEl = $bindable<HTMLVideoElement | null>(),
    enableJokeFeatures = true,
    streamEndpoint = "/api/whep",
  } = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let controlsEl: HTMLDivElement;
  let volume = $state(0);
  let isMuted = $state(true);
  let isFullscreen = $state(false);
  let controlsVisible = $state(true);
  let isPointerOverControls = $state(false);
  let lastNonZeroVolume = $state(0.5);
  let hideTimer: number | undefined;

  const HIDE_DELAY_MS = 2000;
  const VOLUME_STEP = 0.05;
  const DEFAULT_UNMUTE_VOLUME = 0.5;

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

  function onSliderInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const next = Number(input.value);
    if (!Number.isNaN(next)) {
      setVolumeNormalized(next);
    }
    showControlsTemporarily();
  }

  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
    showControlsTemporarily();
  }

  $effect(() => {
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  });

  // Keyboard controls: ArrowUp/Down ±5%, 'm' mute, 'f' fullscreen
  $effect(() => {
    const onKeydown = (event: KeyboardEvent) => {
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
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  // Pointer activity within the player keeps controls visible
  $effect(() => {
    const el = containerEl;
    if (!el) return;
    const onMove = () => showControlsTemporarily();
    const onDown = () => showControlsTemporarily();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
    };
  });

  // Hovering controls prevents auto-hide; leaving reschedules hide
  $effect(() => {
    if (!controlsEl) return;
    const onEnter = () => {
      isPointerOverControls = true;
      controlsVisible = true;
      clearHideTimer();
    };
    const onLeave = () => {
      isPointerOverControls = false;
      scheduleHide();
    };
    controlsEl.addEventListener("pointerenter", onEnter);
    controlsEl.addEventListener("pointerleave", onLeave);
    return () => {
      controlsEl.removeEventListener("pointerenter", onEnter);
      controlsEl.removeEventListener("pointerleave", onLeave);
    };
  });

  // Resizing logic
  $effect(() => {
    const el = containerEl;
    if (!el) return;

    const ASPECT_RATIO = 16 / 9;
    const MAX_MARGIN_FACTOR = 0.9;
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

    // Re-apply constraints on viewport or parent changes
    const onWindowResize = () => applyResizable(false);
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    const parentEl = el.parentElement as HTMLElement | null;
    let resizeObserver: ResizeObserver | undefined;
    if (parentEl) {
      resizeObserver = new ResizeObserver(() => applyResizable(false));
      resizeObserver.observe(parentEl);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
      if (interact.isSet(el)) {
        interact(el).unset();
      }
    };
  });
</script>

<div
  bind:this={containerEl}
  class="player-root"
  class:hide-cursor={isFullscreen && !controlsVisible}
>
  <video
    bind:this={videoEl}
    autoplay
    playsinline
    muted
    use:whep={{ endpoint: streamEndpoint }}
    style="width: 100%; height: 100%; display: block;"
  ></video>

  {#if enableJokeFeatures}
    <Catstare {containerEl} />
  {/if}

  <div bind:this={controlsEl} class="controls" class:visible={controlsVisible}>
    <button
      type="button"
      class="icon-btn"
      aria-label={isMuted ? "Unmute" : "Mute"}
      title={(isMuted ? "Unmute" : "Mute") + " (m, ↑/↓)"}
      onclick={toggleMute}
      aria-pressed={isMuted}
    >
      {#if isMuted}
        <!-- https://lucide.dev/icons/volume-off -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-volume-off-icon lucide-volume-off"
          aria-hidden="true"
          ><path d="M16 9a5 5 0 0 1 .95 2.293" /><path
            d="M19.364 5.636a9 9 0 0 1 1.889 9.96"
          /><path d="m2 2 20 20" /><path
            d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"
          /><path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686" /></svg
        >
      {:else if volume < 0.33}
        <!-- https://lucide.dev/icons/volume -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-volume-icon lucide-volume"
          aria-hidden="true"
          ><path
            d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
          /></svg
        >
      {:else if volume < 0.66}
        <!-- https://lucide.dev/icons/volume-1 -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-volume1-icon lucide-volume-1"
          aria-hidden="true"
          ><path
            d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
          /><path d="M16 9a5 5 0 0 1 0 6" /></svg
        >
      {:else}
        <!-- https://lucide.dev/icons/volume-2 -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-volume2-icon lucide-volume-2"
          aria-hidden="true"
          ><path
            d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
          /><path d="M16 9a5 5 0 0 1 0 6" /><path
            d="M19.364 18.364a9 9 0 0 0 0-12.728"
          /></svg
        >
      {/if}
    </button>

    <input
      class="volume-slider"
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={volume}
      oninput={onSliderInput}
      aria-label="Volume"
    />

    <button
      type="button"
      class="icon-btn"
      aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
      title={(isFullscreen ? "Exit full screen" : "Full screen") + " (f)"}
      onclick={toggleFullscreen}
    >
      {#if !isFullscreen}
        <!-- https://lucide.dev/icons/maximize -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-maximize-icon lucide-maximize"
          aria-hidden="true"
          ><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path
            d="M21 8V5a2 2 0 0 0-2-2h-3"
          /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path
            d="M16 21h3a2 2 0 0 0 2-2v-3"
          /></svg
        >
      {:else}
        <!-- https://lucide.dev/icons/minimize -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-minimize-icon lucide-minimize"
          aria-hidden="true"
          ><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path
            d="M21 8h-3a2 2 0 0 1-2-2V3"
          /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path
            d="M16 21v-3a2 2 0 0 1 2-2h3"
          /></svg
        >
      {/if}
    </button>
  </div>
</div>

<style>
  .player-root {
    width: min(60vw, calc(60vh * 16 / 9));
    height: calc(min(60vw, 60vh * 16 / 9) / (16 / 9));
    max-width: 90vw;
    max-height: 90vh;
    aspect-ratio: 16 / 9;
    border: 2px solid #333;
    background-color: #000;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
    touch-action: none;
    box-sizing: border-box;
    position: relative;
    z-index: 2;
    overflow: hidden;
  }

  @media (max-width: 600px) {
    .player-root {
      width: min(90vw, calc(90vh * 16 / 9));
      height: calc(min(90vw, 90vh * 16 / 9) / (16 / 9));
    }
  }

  .controls {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
    border-radius: 8px;
    padding: 6px 8px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(6px) translateZ(0);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease,
      visibility 0.2s ease;
    z-index: 10;
    isolation: isolate;
  }

  .controls.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border-radius: 6px;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .volume-slider {
    width: 120px;
    accent-color: #fff;
  }

  .player-root.hide-cursor,
  .player-root.hide-cursor * {
    cursor: none !important;
  }
</style>
