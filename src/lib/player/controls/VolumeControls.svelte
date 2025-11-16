<script lang="ts">
  import { onMount } from "svelte";
  import { Volume, Volume1, Volume2, VolumeX } from "@lucide/svelte";

  const STEP = 0.05;
  const DEFAULT_VOLUME = 0.5;

  let {
    video = null,
    storageKey = "player.volume",
    onShowControls = () => {},
    volumeKeysSuspended = false,
  }: {
    video?: HTMLVideoElement | null;
    storageKey?: string;
    onShowControls?: () => void;
    volumeKeysSuspended?: boolean;
  } = $props();

  let volume = $state(0);
  let isMuted = $state(true);
  let lastNonZeroVolume = $state(DEFAULT_VOLUME);
  let volumeKeysBlocked = $state(false);

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

  const applyVideoState = () => {
    const el = video;
    if (!el) return;
    el.volume = volume;
    el.muted = isMuted;
  };

  const persistState = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          volume,
          isMuted,
          lastVolume: lastNonZeroVolume,
        }),
      );
    } catch (error) {
      console.warn("Failed to persist player volume", error);
    }
  };

  const setVolumeNormalized = (next: number) => {
    const clamped = clamp01(next);
    const wasMuted = isMuted;
    volume = clamped;
    if (clamped === 0) {
      isMuted = true;
    } else {
      lastNonZeroVolume = clamped;
      if (isMuted) isMuted = false;
      if (wasMuted) {
        try {
          video?.play?.();
        } catch {}
      }
    }
    applyVideoState();
    persistState();
  };

  const toggleMute = () => {
    if (isMuted) {
      const restored =
        lastNonZeroVolume > 0 ? lastNonZeroVolume : DEFAULT_VOLUME;
      setVolumeNormalized(restored);
    } else {
      if (volume > 0) lastNonZeroVolume = volume;
      isMuted = true;
      applyVideoState();
      persistState();
    }
    onShowControls?.();
  };

  const adjustVolume = (delta: number) => {
    setVolumeNormalized(volume + delta);
    onShowControls?.();
  };

  const handleInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;
    const next = parseFloat(target.value);
    if (!Number.isNaN(next)) {
      setVolumeNormalized(next);
      onShowControls?.();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (volumeKeysBlocked) return;
    const targetEl = event.target as HTMLElement | null;
    if (
      targetEl &&
      ["input", "textarea", "select"].includes(
        (targetEl.tagName || "").toLowerCase(),
      )
    ) {
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      adjustVolume(STEP);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      adjustVolume(-STEP);
    } else if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      toggleMute();
    }
  };

  const restoreState = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        volume?: number;
        isMuted?: boolean;
        lastVolume?: number;
      };
      if (typeof saved.volume === "number") {
        volume = clamp01(saved.volume);
      }
      if (typeof saved.lastVolume === "number") {
        lastNonZeroVolume = clamp01(saved.lastVolume);
      } else if (volume > 0) {
        lastNonZeroVolume = volume;
      } else {
        lastNonZeroVolume = DEFAULT_VOLUME;
      }
      // Always start muted to satisfy autoplay policies, regardless of stored state
      isMuted = true;
    } catch (error) {
      console.warn("Failed to restore player volume", error);
    }
  };

  onMount(() => {
    restoreState();
    applyVideoState();
  });

  $effect(applyVideoState);
  $effect(() => {
    volumeKeysBlocked = volumeKeysSuspended;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="volume-controls">
  <button
    type="button"
    class="player-control-btn"
    aria-label={isMuted ? "Unmute" : "Mute"}
    title={(isMuted ? "Unmute" : "Mute") + " (m)"}
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
    step={STEP}
    value={volume}
    oninput={handleInput}
    title="Adjust volume (↑/↓)"
    aria-label="Volume"
    aria-valuemin="0"
    aria-valuemax="1"
    aria-valuenow={volume}
  />
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .volume-controls {
    @apply flex items-center gap-2.5;
  }

  .volume-slider {
    @apply w-[120px] accent-white;
  }
</style>
