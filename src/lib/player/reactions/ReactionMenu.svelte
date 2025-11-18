<script lang="ts">
  import type { ReactionItem } from "./reaction-service.svelte";

  let {
    reactions = [],
    onSelect,
    onClose,
    onInteract,
    isDisabled = false,
  }: {
    reactions?: ReactionItem[];
    onSelect: (item: ReactionItem) => void;
    onClose: () => void;
    onInteract?: () => void;
    isDisabled?: boolean;
  } = $props();

  let selectedIndex = $state(0);
  let gridEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!isDisabled && reactions.length > 0) {
      gridEl?.focus();
    }
  });

  $effect(() => {
    if (selectedIndex >= reactions.length) selectedIndex = 0;
    const target = gridEl?.children[selectedIndex] as HTMLElement;
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  function handleKeydown(e: KeyboardEvent) {
    if (isDisabled || !reactions.length) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(reactions[selectedIndex]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + reactions.length) % reactions.length;
      onInteract?.();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % reactions.length;
      onInteract?.();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cols = Math.floor((gridEl?.clientWidth ?? 0) / 96) || 1;
      selectedIndex = Math.max(0, selectedIndex - cols);
      onInteract?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cols = Math.floor((gridEl?.clientWidth ?? 0) / 96) || 1;
      selectedIndex = Math.min(reactions.length - 1, selectedIndex + cols);
      onInteract?.();
    }
  }
</script>

{#if !isDisabled && reactions.length > 0}
  <div
    role="listbox"
    tabindex="0"
    class="reaction-grid"
    bind:this={gridEl}
    onkeydown={handleKeydown}
  >
    {#each reactions as r, i (r.id)}
      <button
        type="button"
        class="reaction-item"
        class:selected={i === selectedIndex}
        onclick={() => {
          onInteract?.();
          onSelect(r);
        }}
        role="option"
        aria-selected={i === selectedIndex}
        title={r.name}
      >
        <img src={r.url} alt={r.name} loading="lazy" />
        <span class="reaction-name">{r.name}</span>
      </button>
    {/each}
  </div>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .reaction-grid {
    @apply grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2 p-3 w-full outline-hidden;
  }

  .reaction-item {
    @apply relative overflow-hidden
    border border-white/10
    bg-white/5
    hover:bg-white/10
    transition-colors
    p-2 rounded-sm
    flex flex-col items-center justify-center gap-2
    text-white text-sm leading-tight
    min-h-24 cursor-pointer;
  }

  .reaction-item.selected {
    @apply ring-2 ring-white/70 bg-white/10 outline-none border-transparent;
  }

  .reaction-item img {
    @apply object-contain w-full h-12 pointer-events-none select-none;
  }

  .reaction-name {
    @apply block w-full text-center truncate text-[0.8rem];
  }
</style>
