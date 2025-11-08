<!-- importing /static/catchip.gif into the bottom right corner of the page -->
<!-- and making it explode on click -->

<script lang="ts">
  import confetti from "canvas-confetti";

  let isGifVisible = $state(true);

  function handleGifClick(event: MouseEvent) {
    isGifVisible = false;

    const origin = {
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
    };

    confetti({
      particleCount: 150,
      spread: 90,
      origin: origin,
      colors: ["#ffc700", "#ff0000", "#ffffff", "#fdff00"],
    });
  }
</script>

{#if isGifVisible}
  <button type="button" onclick={handleGifClick} class="gif-button">
    <img src="/catchip.gif" alt="cat eating chips" class="corner-gif" />
  </button>
{/if}

<style lang="postcss">
  @reference "tailwindcss";

  .gif-button {
    @apply bg-transparent 
    border-0 
    p-0 m-0 
    block 
    leading-0
    fixed 
    bottom-[15px] right-[15px] 
    z-1 
    cursor-pointer;
  }

  .corner-gif {
    @apply w-[120px] 
    h-auto 
    opacity-80 
    transition-transform duration-200 ease-in-out;
  }

  .gif-button:hover .corner-gif {
    @apply scale-110;
  }
</style>
