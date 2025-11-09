<script lang="ts">
  let {
    containerEl = $bindable<HTMLDivElement | null>(),
    imagePath = "/cats/stare.jpg",
    images = $bindable<string[] | null>(null),
  } = $props();

  let showCatStare = $state(false);
  let overlaySizePx = $state(0);
  let rectLeft = $state(0);
  let rectTop = $state(0);
  let rectWidth = $state(0);
  let rectHeight = $state(0);
  let catTimer: number | undefined;

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

  // SSE listen for catstare
  $effect(() => {
    const es = new EventSource("/api/events");
    const onCat = () => {
      if (catTimer !== undefined) {
        clearTimeout(catTimer);
        catTimer = undefined;
      }
      showCatStare = true;
      catTimer = window.setTimeout(() => {
        showCatStare = false;
        catTimer = undefined;
      }, 1000);
    };
    es.addEventListener("catstare", onCat);
    return () => {
      es.removeEventListener("catstare", onCat);
      es.close();
    };
  });

  async function triggerCatStare() {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "catstare", payload: { at: Date.now() } }),
      });
    } catch (e) {
      console.error("Failed to trigger catstare", e);
    }
  }

  // Keybinding: press 'c' to trigger catstare
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
      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        triggerCatStare();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  // (button now rendered in Main.svelte; keep keybinding here)
</script>

<div class="catstare-root" style="display: contents;">
  <!-- Fixed overlay aligned to the player rect -->
  <div
    class="catstare-overlay"
    class:visible={showCatStare}
    aria-hidden={!showCatStare}
    style={`position:fixed;left:${rectLeft}px;top:${rectTop}px;width:${rectWidth}px;height:${rectHeight}px;`}
  >
    <img
      src={imagePath}
      alt="Cat stare"
      style={`width:${overlaySizePx}px;height:${overlaySizePx}px`}
    />
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  :global(.catstare-injected-button) {
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

  .catstare-overlay {
    @apply fixed 
    grid 
    place-items-center 
    pointer-events-none 
    z-5 
    opacity-0 
    scale-[0.98]
    transition-all duration-250 ease-in-out;
  }

  .catstare-overlay.visible {
    @apply opacity-100 scale-100;
  }

  .catstare-overlay img {
    @apply block object-contain shadow-[0_12px_28px_rgba(0,0,0,0.7)];
  }
</style>
