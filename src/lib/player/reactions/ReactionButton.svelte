<script lang="ts">
  import { asset } from "$app/paths";
  import { Sticker } from "@lucide/svelte";
  import ReactionMenu from "./ReactionMenu.svelte";
  import {
    getCachedReactions,
    loadReactions,
    subscribeToReactions,
    triggerReaction,
    type ReactionItem,
    type ReactionSignal,
  } from "./reaction-service.svelte";

  type PlayerSize = { width: number; height: number };

  let {
    player = null,
    stage = null,
    playerSize = null,
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
    overlayImages?: string[] | null;
    overlayDuration?: number;
    suspendVolumeKeys?: (() => () => void) | null;
    onRevealControls?: () => void;
    onMenuOpen?: () => void;
    onMenuClose?: () => void;
  } = $props();

  const host = $derived(stage ?? player);

  let isOpen = $state(false);
  let isLoading = $state(false);
  let loadError: string | null = $state(null);
  let reactions = $state<ReactionItem[]>([]);

  let menuLayout = $state({
    width: 240,
    maxHeight: 280,
    placement: "top" as "top" | "bottom",
  });

  let popoverEl = $state<HTMLDivElement | null>(null);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let releaseVolumeKeys: (() => void) | null = null;

  let overlayReaction = $state<ReactionItem | null>(null);
  let overlayVisible = $state(false);
  let overlaySizePx = $state(0);
  let overlayLeft = $state(0);
  let overlayTop = $state(0);
  let overlayTimer: number | null = null;
  let overlayEl: HTMLDivElement | null = null;

  const prefetchedUrls = new Set<string>();

  const toAssetUrl = (value: string) => {
    if (!value) return value;
    if (/^https?:\/\//.test(value)) return value;
    let normalized = value;
    if (normalized.startsWith("/static/")) {
      normalized = normalized.slice("/static".length);
    } else if (normalized.startsWith("static/")) {
      normalized = normalized.slice("static".length);
    }
    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }
    return asset(normalized);
  };

  const resolvedOverlayImages = $derived.by(() => {
    if (!Array.isArray(overlayImages) || overlayImages.length === 0) return [];
    return overlayImages
      .map((src) => (typeof src === "string" ? toAssetUrl(src) : null))
      .filter((src): src is string => typeof src === "string");
  });

  const overlayImageUrl = $derived(
    overlayReaction?.url ?? resolvedOverlayImages[0] ?? null,
  );

  const menuDisabled = $derived(
    isLoading || !!loadError || reactions.length === 0,
  );

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const preloadImage = (url?: string | null) => {
    if (!url || typeof Image === "undefined" || prefetchedUrls.has(url)) return;
    const img = new Image();
    img.src = url;
    prefetchedUrls.add(url);
  };

  const preloadReactions = (list: ReactionItem[]) =>
    list.forEach((item) => preloadImage(item.url));

  async function ensureReactions() {
    if (isLoading) return;
    const cached = getCachedReactions();
    if (cached && cached.length > 0) {
      reactions = [...cached];
      preloadReactions(cached);
      return;
    }
    isLoading = true;
    loadError = null;
    try {
      const list = await loadReactions();
      reactions = [...list];
      preloadReactions(list);
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Failed to load reactions";
    } finally {
      isLoading = false;
    }
  }

  function applyReaction(reaction: ReactionItem) {
    const idx = reactions.findIndex((item) => item.id === reaction.id);
    if (idx === -1) {
      reactions = [...reactions, reaction];
    } else {
      const next = [...reactions];
      next[idx] = reaction;
      reactions = next;
    }
    preloadImage(reaction.url);
  }

  function showOverlay(reaction: ReactionItem) {
    overlayReaction = reaction;
    preloadImage(reaction.url);
    overlayVisible = true;
    if (typeof window !== "undefined") {
      if (overlayTimer) {
        window.clearTimeout(overlayTimer);
      }
      overlayTimer = window.setTimeout(() => {
        overlayVisible = false;
        overlayTimer = null;
      }, overlayDuration);
    }
    updateOverlayRect();
  }

  function handleReactionSignal(signal: ReactionSignal) {
    applyReaction(signal.reaction);
    if (signal.origin === "remote") {
      showOverlay(signal.reaction);
    }
  }

  async function handleSelect(reaction: ReactionItem) {
    try {
      applyReaction(reaction);
      showOverlay(reaction);
      await triggerReaction(reaction);
    } catch (error) {
      console.error("Failed to trigger reaction", error);
    } finally {
      closeMenu();
    }
  }

  function mountOverlay() {
    if (!overlayEl) return;
    const target = host;
    if (!target) return;
    if (overlayEl.parentElement !== target) {
      target.appendChild(overlayEl);
    }
    updateOverlayRect();
  }

  function attachOverlay(node: HTMLDivElement) {
    overlayEl = node;
    mountOverlay();
    return {
      destroy() {
        overlayEl = null;
        node.remove();
      },
    };
  }

  function updateOverlayRect(rect?: DOMRectReadOnly) {
    const target = host;
    if (!target) return;
    const bounds = rect ?? target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const padding = 16;
    const minDim = Math.min(bounds.width, bounds.height);
    const size = Math.min(Math.floor(minDim * 0.45), minDim - padding * 2);
    overlaySizePx = Math.max(140, size);
    const pivotX = bounds.width * 0.5;
    const pivotY = bounds.height * 0.5;
    const rawLeft = pivotX - overlaySizePx / 2;
    const rawTop = pivotY - overlaySizePx / 2;
    overlayLeft = Math.round(
      clamp(rawLeft, padding, bounds.width - overlaySizePx - padding),
    );
    overlayTop = Math.round(
      clamp(rawTop, padding, bounds.height - overlaySizePx - padding),
    );
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    releaseVolumeKeys = suspendVolumeKeys?.() ?? null;
    ensureReactions();
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

  $effect(() => {
    if (typeof window === "undefined") return;
    ensureReactions();
  });

  $effect(() => {
    const overlays = Array.isArray(resolvedOverlayImages)
      ? resolvedOverlayImages
      : [];
    for (const src of overlays) {
      preloadImage(src);
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
    if (typeof window === "undefined") return;
    const unsubscribe = subscribeToReactions(handleReactionSignal);
    return () => {
      unsubscribe();
      if (overlayTimer) {
        window.clearTimeout(overlayTimer);
        overlayTimer = null;
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
    updateOverlayRect();
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const target = host;
    if (!target) return;
    updateOverlayRect();
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      updateOverlayRect(entry.contentRect);
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  });

  $effect(() => {
    const url = overlayImageUrl;
    if (typeof Image === "undefined" || !url) return;
    const img = new Image();
    img.src = url;
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
        onSelect={handleSelect}
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
    <img src={overlayImageUrl ?? ""} alt="Reaction" draggable="false" />
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
