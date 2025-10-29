<script lang="ts">
  import favicon from "$lib/assets/favicon.ico";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<style>
  :global(body) {
    background-color: #000; /* Fallback for older browsers */
    background-image: linear-gradient(
      135deg,
      #101018 0%,
      #0d0d12 50%,
      #000000 100%
    );
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    margin: 0;
  }
</style>
