<script lang="ts">
  let { containerEl = $bindable<HTMLDivElement | null>() } = $props();

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

  // Inject control button into the player's controls. This allows easy removal from Main.svelte
  $effect(() => {
    if (!containerEl) return;
    const host = containerEl.querySelector(
      ".controls"
    ) as HTMLDivElement | null;
    if (!host) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "catstare-injected-button";
    btn.setAttribute("aria-label", "Summon cat");
    btn.title = "Summon cat (c)";
    btn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cat-icon lucide-cat" aria-hidden="true"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>`;
    const onClick = () => {
      triggerCatStare();
    };
    btn.addEventListener("click", onClick);
    host.insertBefore(btn, host.firstChild);
    return () => {
      btn.removeEventListener("click", onClick);
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    };
  });
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
      src="/catstare.jpg"
      alt="Cat stare"
      style={`width:${overlaySizePx}px;height:${overlaySizePx}px`}
    />
  </div>
</div>

<style>
  :global(.catstare-injected-button) {
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

  :global(.catstare-injected-button:hover) {
    background: rgba(255, 255, 255, 0.08);
  }

  .catstare-overlay {
    position: fixed; /* left/top/width/height set inline */
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 5;
    opacity: 0;
    transform: scale(0.98);
    transition:
      opacity 250ms ease,
      transform 250ms ease;
  }

  .catstare-overlay.visible {
    opacity: 1;
    transform: scale(1);
  }

  .catstare-overlay img {
    display: block;
    object-fit: contain;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.7);
  }

  /* no button styles here; the button lives in Player controls */
</style>
