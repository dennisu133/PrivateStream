<script lang="ts">
  import type { ReactionItem } from "./reaction-service.svelte";

  type PlayerSize = { width: number; height: number };
  type MenuLayout = {
    width: number;
    maxHeight: number;
    placement: "top" | "bottom";
  };

  const DEFAULT_PLAYER_SIZE: PlayerSize = { width: 960, height: 540 };
  const MIN_POPOVER_WIDTH = 160;
  const MAX_POPOVER_WIDTH = 320;
  const ABS_MIN_POPOVER_WIDTH = 120;
  const MIN_POPOVER_HEIGHT = 140;
  const WIDTH_RATIO = 0.35;
  let {
    reactions = [] as ReactionItem[],
    onSelect,
    onClose,
    onInteract,
    host = null as HTMLElement | null,
    anchor = null as HTMLElement | null,
    playerSize = null as PlayerSize | null,
    isDisabled = false,
    layout = $bindable<MenuLayout>({
      width: MIN_POPOVER_WIDTH,
      maxHeight: 280,
      placement: "top",
    }),
  }: {
    reactions?: ReactionItem[];
    onSelect: (item: ReactionItem) => void;
    onClose: () => void;
    onInteract?: () => void;
    host?: HTMLElement | null;
    anchor?: HTMLElement | null;
    playerSize?: PlayerSize | null;
    isDisabled?: boolean;
    layout?: MenuLayout;
  } = $props();

  const EDGE_MARGIN = 16;
  const ANCHOR_GAP = 8;
  const TILE_WIDTH = 88;
  const TILE_GAP = 8;
  const MAX_COLUMNS = 3;

  let selectedIndex = $state(0);
  let focusEl = $state<HTMLDivElement | null>(null);
  let gridWidth = $state(0);
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const columnCap = $derived.by(() => {
    if (!gridWidth) return MAX_COLUMNS;
    for (let c = MAX_COLUMNS; c >= 1; c -= 1) {
      const needed = c * TILE_WIDTH + (c - 1) * TILE_GAP;
      if (gridWidth >= needed) {
        return c;
      }
    }
    return 1;
  });
  const columns = $derived.by(() => {
    const total = Math.max(1, reactions.length || 1);
    return Math.max(1, Math.min(total, columnCap));
  });

  const computeLayout = () => {
    const fallback = playerSize ?? DEFAULT_PLAYER_SIZE;
    const hostRect = host?.getBoundingClientRect() ?? null;
    const anchorRect = anchor?.getBoundingClientRect() ?? null;
    const viewportHeight =
      typeof window === "undefined" ? fallback.height : window.innerHeight;
    const viewportWidth =
      typeof window === "undefined" ? fallback.width : window.innerWidth;
    const clampSpace = (value: number) => Math.max(0, Math.floor(value));

    const hostWidth = hostRect?.width ?? fallback.width;
    const hostHeight = hostRect?.height ?? fallback.height;

    const baseWidth = clamp(
      Math.round(hostWidth * WIDTH_RATIO),
      ABS_MIN_POPOVER_WIDTH,
      MAX_POPOVER_WIDTH,
    );

    const viewportRightSpace = anchorRect
      ? clampSpace(viewportWidth - anchorRect.left - EDGE_MARGIN)
      : clampSpace(viewportWidth - EDGE_MARGIN * 2);
    const hostRightSpace =
      hostRect && anchorRect
        ? clampSpace(hostRect.right - anchorRect.left - EDGE_MARGIN)
        : clampSpace(hostWidth - EDGE_MARGIN * 2);
    const widthBudget = Math.max(
      ABS_MIN_POPOVER_WIDTH,
      Math.min(
        baseWidth,
        viewportRightSpace,
        hostRightSpace,
        clampSpace(viewportWidth - EDGE_MARGIN * 2),
        clampSpace(hostWidth - EDGE_MARGIN * 2),
      ),
    );

    const hostAboveSpace =
      hostRect && anchorRect
        ? clampSpace(anchorRect.top - hostRect.top - (EDGE_MARGIN + ANCHOR_GAP))
        : clampSpace(hostHeight / 2);
    const hostBelowSpace =
      hostRect && anchorRect
        ? clampSpace(
            hostRect.bottom - anchorRect.bottom - (EDGE_MARGIN + ANCHOR_GAP),
          )
        : clampSpace(hostHeight / 2);
    const viewportAboveSpace = anchorRect
      ? clampSpace(anchorRect.top - EDGE_MARGIN)
      : clampSpace(viewportHeight / 2);
    const viewportBelowSpace = anchorRect
      ? clampSpace(viewportHeight - anchorRect.bottom - EDGE_MARGIN)
      : clampSpace(viewportHeight / 2);

    const topSpace = Math.min(hostAboveSpace, viewportAboveSpace);
    const bottomSpace = Math.min(hostBelowSpace, viewportBelowSpace);
    const placement = topSpace >= bottomSpace ? "top" : "bottom";
    const verticalBudget = placement === "top" ? topSpace : bottomSpace;

    const viewportCap = Math.max(
      MIN_POPOVER_HEIGHT,
      Math.floor(viewportHeight - EDGE_MARGIN * 2),
    );
    const hostCap = Math.max(
      MIN_POPOVER_HEIGHT,
      Math.floor(hostHeight - EDGE_MARGIN * 2),
    );
    const maxHeight = Math.max(
      MIN_POPOVER_HEIGHT,
      Math.min(
        verticalBudget > 0 ? verticalBudget : viewportCap,
        viewportCap,
        hostCap,
      ),
    );

    layout = {
      width: Math.max(ABS_MIN_POPOVER_WIDTH, Math.round(widthBudget)),
      maxHeight: Math.round(maxHeight),
      placement,
    };
  };

  $effect(() => {
    if (isDisabled || reactions.length === 0) return;
    queueMicrotask(() => {
      if (!focusEl) return;
      focusEl.focus();
    });
  });

  $effect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const grid = focusEl;
    if (!grid) return;
    gridWidth = grid.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      gridWidth = entry.contentRect.width;
    });
    observer.observe(grid);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (selectedIndex >= reactions.length) {
      selectedIndex = Math.max(0, reactions.length - 1);
    }
  });

  $effect(() => {
    const grid = focusEl;
    if (!grid) return;
    const buttons = grid.querySelectorAll<HTMLButtonElement>(".reaction-item");
    const target = buttons[selectedIndex];
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  $effect(() => {
    playerSize;
    computeLayout();
  });

  $effect(() => {
    host;
    anchor;
    if (typeof ResizeObserver === "undefined") return;
    const observers: ResizeObserver[] = [];
    const observe = (node: Element | null) => {
      if (!node) return;
      const observer = new ResizeObserver(() => computeLayout());
      observer.observe(node);
      observers.push(observer);
    };
    observe(host);
    observe(anchor && anchor !== host ? anchor : null);
    return () => observers.forEach((observer) => observer.disconnect());
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => computeLayout();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (isDisabled || reactions.length === 0) {
      if (e.key === "Escape") {
        onClose();
        e.preventDefault();
      }
      return;
    }
    const cols = Math.max(1, columns);
    switch (e.key) {
      case "ArrowRight":
        selectedIndex = (selectedIndex + 1) % reactions.length;
        onInteract?.();
        e.preventDefault();
        break;
      case "ArrowLeft":
        selectedIndex =
          (selectedIndex - 1 + reactions.length) % reactions.length;
        onInteract?.();
        e.preventDefault();
        break;
      case "ArrowDown":
        selectedIndex = Math.min(reactions.length - 1, selectedIndex + cols);
        onInteract?.();
        e.preventDefault();
        break;
      case "ArrowUp":
        selectedIndex = Math.max(0, selectedIndex - cols);
        onInteract?.();
        e.preventDefault();
        break;
      case "Enter":
        onInteract?.();
        onSelect(reactions[selectedIndex]);
        e.preventDefault();
        break;
      case "Escape":
        onClose();
        e.preventDefault();
        break;
    }
  }
</script>

{#if !isDisabled && reactions.length > 0}
  <div
    role="listbox"
    class="reaction-grid"
    bind:this={focusEl}
    tabindex="-1"
    onkeydown={handleKeydown}
    style={`grid-template-columns:repeat(${columns},minmax(0,1fr));`}
  >
    {#each reactions as r, i (r.id)}
      <button
        type="button"
        class={`reaction-item ${i === selectedIndex ? "is-selected" : ""}`}
        title={r.name}
        onclick={() => {
          onInteract?.();
          onSelect(r);
        }}
        role="menuitem"
      >
        <img src={r.url} alt={r.name} />
        <span class="reaction-name">{r.name}</span>
      </button>
    {/each}
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .reaction-grid {
    @apply grid gap-2 outline-hidden;
  }

  .reaction-item {
    @apply relative overflow-hidden
    border border-white/10
    bg-white/5
    hover:bg-white/10
    transition-colors
    px-2 py-2
    flex flex-col items-center justify-center gap-2
    text-white text-sm leading-tight
    min-h-24;
  }

  .reaction-item.is-selected {
    @apply outline outline-white/70;
  }

  .reaction-item img {
    @apply object-contain w-full h-16 pointer-events-none select-none;
  }

  .reaction-name {
    @apply block w-full text-center truncate text-[0.95rem];
  }

  @media (max-width: 480px) {
    .reaction-grid {
      @apply gap-1.5;
    }
    .reaction-item {
      @apply px-1.5 py-1.5 gap-1 text-xs min-h-20;
    }
    .reaction-item img {
      @apply h-12;
    }
    .reaction-name {
      @apply text-xs;
    }
  }
</style>
