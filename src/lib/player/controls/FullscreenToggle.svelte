<script lang="ts">
  import { Maximize, Minimize } from "@lucide/svelte";

  let {
    target = null,
    onShowControls = () => {},
  }: {
    target?: HTMLElement | null;
    onShowControls?: () => void;
  } = $props();

  let isFullscreen = $state(false);

  const syncFullscreen = () => {
    if (typeof document === "undefined") {
      isFullscreen = false;
      return;
    }
    const el = target;
    if (!el) {
      isFullscreen = false;
      return;
    }
    isFullscreen = document.fullscreenElement === el;
  };

  const toggleFullscreen = async () => {
    const el = target;
    if (!el || typeof document === "undefined") return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    } finally {
      onShowControls?.();
      syncFullscreen();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "f" && event.key !== "F") return;
    const targetEl = event.target as HTMLElement | null;
    if (
      targetEl &&
      ["input", "textarea", "select"].includes(
        (targetEl.tagName || "").toLowerCase(),
      )
    ) {
      return;
    }
    if (!target) return;
    event.preventDefault();
    toggleFullscreen();
  };

  $effect(() => {
    const currentTarget = target;
    syncFullscreen();
    if (typeof document === "undefined") return;
    const handler = () => syncFullscreen();
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<button
  type="button"
  class="player-control-btn"
  aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
  title={(isFullscreen ? "Exit full screen" : "Full screen") + " (f)"}
  aria-pressed={isFullscreen}
  onclick={toggleFullscreen}
>
  {#if !isFullscreen}
    <Maximize size={24} strokeWidth={2} aria-hidden="true" />
  {:else}
    <Minimize size={24} strokeWidth={2} aria-hidden="true" />
  {/if}
</button>
