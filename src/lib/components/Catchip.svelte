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

<style>
  .gif-button {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    display: block;
    line-height: 0; /* Prevents extra space under the image */

    /* Positioning */
    position: fixed;
    bottom: 15px;
    right: 15px;
    z-index: 1; /* Ensure gif is below the player */
    cursor: pointer;
  }

  .corner-gif {
    width: 120px;
    height: auto;
    opacity: 0.8;
    transition: transform 0.2s ease;
  }

  .gif-button:hover .corner-gif {
    transform: scale(1.1);
  }
</style>
