<script lang="ts">
  import Player from "$lib/components/Player/Main.svelte";
  import Catchip from "$lib/components/Catchip.svelte";
  import Neko from "$lib/components/Neko.svelte";

  let videoEl = $state<HTMLVideoElement | null>(null);
</script>

<Neko />

<main>
  <Player bind:videoEl streamEndpoint="/api/whep" />
</main>

<Catchip />

<style lang="postcss">
  @reference "tailwindcss";

  main {
    @apply flex 
    justify-center 
    items-center 
    h-screen 
    w-screen;
  }
</style>
