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

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    box-sizing: border-box;
    padding: 1rem;
  }
</style>
