<script lang="ts">
  import ReactionButton from "./reactions/ReactionButton.svelte";
  import VolumeControls from "./controls/VolumeControls.svelte";
  import FullscreenToggle from "./controls/FullscreenToggle.svelte";

  const HIDE_DELAY = 2200;

  let {
    player = null,
    stage = null,
    video = null,
    enableFunFeatures = true,
    playerSize = null,
  }: {
    player?: HTMLElement | null;
    stage?: HTMLElement | null;
    video?: HTMLVideoElement | null;
    enableFunFeatures?: boolean;
    playerSize?: { width: number; height: number } | null;
  } = $props();

  let rootEl = $state<HTMLDivElement | null>(null);
  let controlsVisible = $state(true);
  let pointerInside = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let holdDepth = 0;
  const volumeKeyLocks = new Set<symbol>();
  let volumeKeysSuspended = $state(false);

  const refreshVolumeSuspended = () => {
    volumeKeysSuspended = volumeKeyLocks.size > 0;
  };

  const suspendVolumeKeys = () => {
    const token = Symbol("volume-lock");
    volumeKeyLocks.add(token);
    refreshVolumeSuspended();
    return () => {
      volumeKeyLocks.delete(token);
      refreshVolumeSuspended();
    };
  };

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = () => {
    if (pointerInside || holdDepth > 0) return;
    clearHideTimer();
    hideTimer = setTimeout(() => {
      if (!pointerInside && holdDepth === 0) {
        controlsVisible = false;
      }
      hideTimer = null;
    }, HIDE_DELAY);
  };

  const showControlsTemporarily = () => {
    controlsVisible = true;
    scheduleHide();
  };

  const onControlsEnter = () => {
    pointerInside = true;
    controlsVisible = true;
    clearHideTimer();
  };

  const onControlsLeave = () => {
    pointerInside = false;
    scheduleHide();
  };

  const holdControls = () => {
    holdDepth += 1;
    controlsVisible = true;
    clearHideTimer();
  };

  const releaseControls = () => {
    holdDepth = Math.max(0, holdDepth - 1);
    if (holdDepth === 0) scheduleHide();
  };

  const attachPointerSensors = (target: HTMLElement) => {
    const pointerEvents = ["pointermove", "pointerdown", "wheel"];
    const onPointer = () => showControlsTemporarily();
    pointerEvents.forEach((event) =>
      target.addEventListener(event, onPointer, { passive: true }),
    );
    const onLeave = () => scheduleHide();
    target.addEventListener("pointerleave", onLeave);
    showControlsTemporarily();
    return () => {
      pointerEvents.forEach((event) =>
        target.removeEventListener(event, onPointer),
      );
      target.removeEventListener("pointerleave", onLeave);
    };
  };

  const onReactionMenuOpen = () => holdControls();
  const onReactionMenuClose = () => releaseControls();
</script>

<div
  bind:this={rootEl}
  class="controls-layer"
  data-visible={controlsVisible}
  {@attach (node) => {
    const target =
      stage ?? (node.parentElement as HTMLElement | null) ?? player;
    if (!target) return;
    return attachPointerSensors(target);
  }}
>
  <div
    class="controls"
    class:visible={controlsVisible}
    onpointerenter={onControlsEnter}
    onpointerleave={onControlsLeave}
  >
    {#if enableFunFeatures}
      <ReactionButton
        {player}
        {stage}
        {playerSize}
        {suspendVolumeKeys}
        onRevealControls={showControlsTemporarily}
        onMenuOpen={() => {
          onReactionMenuOpen();
          showControlsTemporarily();
        }}
        onMenuClose={() => {
          onReactionMenuClose();
          showControlsTemporarily();
        }}
      />
    {/if}

    <VolumeControls
      {video}
      onShowControls={showControlsTemporarily}
      {volumeKeysSuspended}
    />

    <FullscreenToggle
      target={stage ?? video ?? player}
      onShowControls={showControlsTemporarily}
    />
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  .controls-layer {
    @apply absolute inset-0 pointer-events-none;
  }

  .controls {
    @apply absolute
    right-2.5 bottom-2.5
    flex items-center gap-2.5
    bg-black/35 backdrop-blur-[2px]
    rounded-lg
    px-2 py-1.5
    opacity-0 invisible
    translate-y-1.5
    transition-all duration-200 ease-in-out
    z-10
    isolate
    pointer-events-auto;
  }

  .controls.visible {
    @apply opacity-100 visible translate-y-0;
  }

  :global(.player-control-btn) {
    @apply bg-transparent
    border-0
    w-8 h-8
    grid
    place-items-center
    cursor-pointer
    rounded-md
    hover:bg-white/10
    outline-hidden focus-visible:outline-hidden
    focus-visible:ring-2 focus-visible:ring-white/40
    transition-colors;
  }
</style>
