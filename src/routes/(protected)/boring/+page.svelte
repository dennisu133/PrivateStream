<script lang="ts">
  import Player from "$lib/components/Player/Main.svelte";
  let videoEl = $state<HTMLVideoElement | null>(null);
</script>

<main>
  <Player bind:videoEl streamEndpoint="/api/whep" enableJokeFeatures={false} />
</main>

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
