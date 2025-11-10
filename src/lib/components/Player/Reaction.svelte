<script lang="ts">
  let {
    containerEl = $bindable<HTMLDivElement | null>(),
    imagePath = "/reactions/stare.jpg",
    images = $bindable<string[] | null>(null),
  } = $props();

  let showReaction = $state(false);
  let overlaySizePx = $state(0);
  let rectLeft = $state(0);
  let rectTop = $state(0);
  let rectWidth = $state(0);
  let rectHeight = $state(0);
  let reactionTimer: number | undefined;

  function updateOverlayRect() {
    if (!containerEl) return;
    const r = containerEl.getBoundingClientRect();
    rectLeft = Math.round(r.left);
    rectTop = Math.round(r.top);
    rectWidth = Math.round(r.width);
    rectHeight = Math.round(r.height);

    const minDim = Math.min(r.width, r.height);
    const target = Math.min(Math.floor(minDim * 0.55), minDim - 24);
    overlaySizePx = Math.max(160, target);
  }

  // Track container/player rect for fixed overlay
  $effect(() => {
    if (!containerEl) return;
    updateOverlayRect();
    const ro = new ResizeObserver(() => updateOverlayRect());
    ro.observe(containerEl);
    const onWindow = () => updateOverlayRect();
    window.addEventListener("resize", onWindow);
    window.addEventListener("orientationchange", onWindow);
    window.addEventListener("scroll", onWindow, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWindow);
      window.removeEventListener("orientationchange", onWindow);
      window.removeEventListener("scroll", onWindow);
    };
  });

  // Preload current image so overlay appears instantly
  $effect(() => {
    if (!imagePath) return;
    const img = new Image();
    img.src = imagePath;
  });

  // SSE listen for reaction events
  $effect(() => {
    const es = new EventSource("/api/events");
    const onReaction = () => {
      if (reactionTimer !== undefined) {
        clearTimeout(reactionTimer);
        reactionTimer = undefined;
      }
      showReaction = true;
      reactionTimer = window.setTimeout(() => {
        showReaction = false;
        reactionTimer = undefined;
      }, 1000);
    };
    es.addEventListener("reaction", onReaction);
    return () => {
      es.removeEventListener("reaction", onReaction);
      es.close();
    };
  });

  async function triggerReaction() {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reaction", payload: { at: Date.now() } }),
      });
    } catch (e) {
      console.error("Failed to trigger reaction", e);
    }
  }

  // Keybinding: press 'r' to trigger reaction
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
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        triggerReaction();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

<div class="reaction-root" style="display: contents;">
  <!-- Fixed overlay aligned to the player rect -->
  <div
    class="reaction-overlay"
    class:visible={showReaction}
    aria-hidden={!showReaction}
    style={`position:fixed;left:${rectLeft}px;top:${rectTop}px;width:${rectWidth}px;height:${rectHeight}px;`}
  >
    <img
      src={imagePath}
      alt="Reaction"
      style={`width:${overlaySizePx}px;height:${overlaySizePx}px`}
    />
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  :global(.reaction-injected-button) {
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

  .reaction-overlay {
    @apply fixed 
    grid 
    place-items-center 
    pointer-events-none 
    z-5 
    opacity-0 
    scale-[0.98]
    transition-all duration-250 ease-in-out;
  }

  .reaction-overlay.visible {
    @apply opacity-100 scale-100;
  }

  .reaction-overlay img {
    @apply block object-contain shadow-[0_12px_28px_rgba(0,0,0,0.7)];
  }
</style>
