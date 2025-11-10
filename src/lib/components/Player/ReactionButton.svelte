<script lang="ts">
  import { Sticker } from "@lucide/svelte";

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
</script>

<button
  type="button"
  class="reaction-btn"
  aria-label="react"
  title="react (r)"
  onclick={triggerReaction}
>
  <Sticker size={24} strokeWidth={2} aria-hidden="true" />
  <span class="sr-only">react</span>
  <!-- visually-hidden label for a11y -->
</button>

<style lang="postcss">
  @reference "tailwindcss";

  .reaction-btn {
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
