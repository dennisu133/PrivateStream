<script lang="ts">
  import { Sticker } from "@lucide/svelte";
  import ReactionMenu from "./ReactionMenu.svelte";
  import {
    ensureReactionManifest,
    getReactionManifest,
    getReactionManifestError,
    subscribeToReactions,
    triggerReaction,
    type ReactionItem,
  } from "./reaction-service.svelte";

  type PlayerSize = { width: number; height: number };

  let {
    player = null,
    stage = null,
    playerSize = null,
    overlayImagePath = "/reactions/stare.jpg",
    overlayImages = null,
    overlayDuration = 1000,
    suspendVolumeKeys = null,
    onRevealControls = () => {},
    onMenuOpen = () => {},
    onMenuClose = () => {},
  }: {
    player?: HTMLElement | null;
    stage?: HTMLElement | null;
    playerSize?: PlayerSize | null;
    overlayImagePath?: string;
    overlayImages?: string[] | null;
    overlayDuration?: number;
    suspendVolumeKeys?: (() => () => void) | null;
    onRevealControls?: () => void;
    onMenuOpen?: () => void;
    onMenuClose?: () => void;
  } = $props();

  let isOpen = $state(false);
  let isLoaded = $state(false);
  let isLoading = $state(false);
  let loadError: string | null = $state(null);
  let reactions = $state<ReactionItem[]>([]);
  let popoverEl = $state<HTMLDivElement | null>(null);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let releaseVolumeKeys: (() => void) | null = null;
  let menuLayout = $state({
    width: 240,
    maxHeight: 280,
    placement: "top" as "top" | "bottom",
  });
  let overlayVisible = $state(false);
  let overlayImageUrl = $state(overlayImagePath);
  let overlaySizePx = $state(0);
  let overlayLeft = $state(0);
  let overlayTop = $state(0);
  let overlayFrame: number | null = null;
  let overlayTimer: number | undefined;
  let overlayEl: HTMLDivElement | null = null;
  const host = $derived(stage ?? player);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const updateOverlayRect = (rect?: DOMRectReadOnly) => {
    const targetEl = host;
    if (!targetEl) return;
    const bounds = rect ?? targetEl.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const padding = 16;
    const minDim = Math.min(bounds.width, bounds.height);
    const targetSize = Math.min(
      Math.floor(minDim * 0.45),
      minDim - padding * 2,
    );
    overlaySizePx = Math.max(140, targetSize);
    const pivotX = bounds.width * 0.5;
    const pivotY = bounds.height * 0.5;
    const rawLeft = pivotX - overlaySizePx / 2;
    const rawTop = pivotY - overlaySizePx / 2;
    const minLeft = padding;
    const maxLeft = bounds.width - overlaySizePx - padding;
    const minTop = padding;
    const maxTop = bounds.height - overlaySizePx - padding;
    overlayLeft = Math.round(clamp(rawLeft, minLeft, maxLeft));
    overlayTop = Math.round(clamp(rawTop, minTop, maxTop));
  };

  const scheduleOverlayRect = (rect?: DOMRectReadOnly) => {
    if (typeof window === "undefined") {
      updateOverlayRect(rect);
      return;
    }
    if (overlayFrame !== null) return;
    overlayFrame = window.requestAnimationFrame(() => {
      overlayFrame = null;
      updateOverlayRect(rect);
    });
  };

  const pickOverlayImage = () => {
    const pool =
      (Array.isArray(overlayImages) && overlayImages.length > 0
        ? overlayImages
        : reactions.map((item) => item.url)) ?? [];
    if (pool.length === 0) return overlayImagePath;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index] ?? overlayImagePath;
  };

  const mountOverlay = () => {
    if (!overlayEl) return;
    const target = host;
    if (!target) return;
    if (overlayEl.parentElement !== target) {
      target.appendChild(overlayEl);
    }
  };

  const attachOverlay = (node: HTMLDivElement) => {
    overlayEl = node;
    mountOverlay();
    return {
      destroy() {
        overlayEl = null;
        node.remove();
      },
    };
  };

  const menuDisabled = $derived(
    isLoading || !!loadError || reactions.length === 0,
  );

  async function loadReactions() {
    if (isLoading) return;
    const cached = getReactionManifest();
    if (cached && !loadError) {
      reactions = cached;
      isLoaded = true;
      return;
    }
    isLoading = true;
    loadError = null;
    try {
      const list = await ensureReactionManifest({
        refresh: !cached,
      });
      reactions = list;
      isLoaded = true;
    } catch (e) {
      console.error("Failed to load reactions", e);
      loadError = e instanceof Error ? e.message : "Failed to load reactions";
    } finally {
      isLoading = false;
    }
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    releaseVolumeKeys = suspendVolumeKeys?.() ?? null;
    loadReactions();
    onMenuOpen?.();
    onRevealControls?.();
    queueMicrotask(() => {
      popoverEl?.focus?.();
    });
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    releaseVolumeKeys?.();
    releaseVolumeKeys = null;
    onMenuClose?.();
  }
  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  async function sendReaction(item: ReactionItem) {
    try {
      await triggerReaction({
        url: item.url,
        name: item.name,
        at: Date.now(),
      });
    } catch (e) {
      console.error("Failed to trigger reaction", e);
    } finally {
      closeMenu();
    }
  }

  $effect(() => {
    if (isLoaded) return;
    const cached = getReactionManifest();
    if (cached) {
      reactions = cached;
      isLoaded = true;
      loadError = null;
      return;
    }
    const err = getReactionManifestError();
    if (err) {
      loadError = err.message ?? "Failed to load reactions";
    }
  });

  $effect(() => {
    if (typeof window === "undefined") return;
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
        onRevealControls?.();
        toggleMenu();
      } else if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  $effect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonEl?.contains(target) || popoverEl?.contains(target)) return;
      if (player && player.contains(target)) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });

  $effect(() => {
    return () => {
      releaseVolumeKeys?.();
      releaseVolumeKeys = null;
    };
  });

  $effect(() => {
    overlayImageUrl = overlayImagePath;
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const target = host;
    if (!target) return;
    updateOverlayRect();
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      scheduleOverlayRect(entry.contentRect);
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      if (overlayFrame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(overlayFrame);
        overlayFrame = null;
      }
    };
  });

  $effect(() => {
    const target = host;
    if (!target) return;
    mountOverlay();
  });

  $effect(() => {
    const size = playerSize;
    if (!size) return;
    scheduleOverlayRect();
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const target = host;
    if (!target) return;
    const unsubscribe = subscribeToReactions(async (payload) => {
      if (
        (!payload?.url || payload.url.length === 0) &&
        (!overlayImages || overlayImages.length === 0) &&
        reactions.length === 0
      ) {
        try {
          const list = await ensureReactionManifest();
          reactions = list;
          isLoaded = true;
        } catch (error) {
          console.warn("Failed to load reactions manifest for overlay", error);
        }
      }
      const nextUrl =
        payload?.url && typeof payload.url === "string" && payload.url
          ? payload.url
          : pickOverlayImage();
      overlayImageUrl = nextUrl;
      if (overlayTimer) {
        clearTimeout(overlayTimer);
      }
      overlayVisible = true;
      overlayTimer = window.setTimeout(() => {
        overlayVisible = false;
        overlayTimer = undefined;
      }, overlayDuration);
    });
    return () => {
      unsubscribe();
      if (overlayTimer) {
        clearTimeout(overlayTimer);
        overlayTimer = undefined;
      }
    };
  });

  $effect(() => {
    if (typeof Image === "undefined" || !overlayImageUrl) return;
    const img = new Image();
    img.src = overlayImageUrl;
  });
</script>

<div class="reaction-wrap" role="group">
  <button
    type="button"
    class="player-control-btn"
    aria-label="react"
    title="react (r)"
    aria-expanded={isOpen}
    onclick={toggleMenu}
    bind:this={buttonEl}
  >
    <Sticker size={24} strokeWidth={2} aria-hidden="true" />
    <span class="sr-only">react</span>
  </button>

  {#if isOpen}
    <div
      class="reaction-popover"
      role="dialog"
      aria-label="Choose reaction"
      tabindex="-1"
      bind:this={popoverEl}
      data-placement={menuLayout.placement}
      style:width={`${menuLayout.width}px`}
      style:max-width={`${menuLayout.width}px`}
      style:max-height={`${menuLayout.maxHeight}px`}
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeMenu();
        }
      }}
    >
      {#if isLoading}
        <div class="reaction-status">Loading…</div>
      {:else if loadError}
        <div class="reaction-status">{loadError}</div>
      {:else if reactions.length === 0}
        <div class="reaction-status">No reactions</div>
      {/if}
      <ReactionMenu
        {reactions}
        {host}
        anchor={buttonEl}
        {playerSize}
        bind:layout={menuLayout}
        onInteract={onRevealControls}
        onSelect={(item: ReactionItem) => sendReaction(item)}
        onClose={closeMenu}
        isDisabled={menuDisabled}
      />
    </div>
  {/if}
</div>

{#if host}
  <div
    class="reaction-overlay"
    aria-hidden={!overlayVisible}
    data-visible={overlayVisible}
    style:left={`${overlayLeft}px`}
    style:top={`${overlayTop}px`}
    style:width={`${overlaySizePx}px`}
    style:height={`${overlaySizePx}px`}
    {@attach attachOverlay}
  >
    <img src={overlayImageUrl} alt="Reaction" draggable="false" />
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .reaction-popover {
    @apply absolute z-50
    overflow-auto
    bg-black/70 backdrop-blur-sm
    p-2;
    right: 0;
    left: auto;
  }

  .reaction-popover[data-placement="top"] {
    top: auto;
    bottom: calc(100% + 8px);
  }

  .reaction-popover[data-placement="bottom"] {
    bottom: auto;
    top: calc(100% + 8px);
  }

  .reaction-status {
    @apply text-sm text-white/80 px-2 py-1;
  }

  .reaction-overlay {
    @apply absolute
    pointer-events-none
    z-30
    opacity-0
    scale-90
    transition-all duration-200 ease-out;
  }

  .reaction-overlay[data-visible="true"] {
    @apply opacity-100 scale-100;
  }

  .reaction-overlay img {
    @apply w-full h-full object-contain;
  }
</style>
