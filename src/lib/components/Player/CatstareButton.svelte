<script lang="ts">
  import { Cat } from "@lucide/svelte";

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
</script>

<button
  type="button"
  class="catstare-btn"
  aria-label="Summon cat"
  title="Summon cat (c)"
  onclick={triggerCatStare}
>
  <Cat size={24} strokeWidth={2} aria-hidden="true" />
  <span class="sr-only">Summon cat</span>
  <!-- visually-hidden label for a11y -->
</button>

<style lang="postcss">
  @reference "tailwindcss";

  .catstare-btn {
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
</style>
