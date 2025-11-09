<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.ico";

  let { children, data } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data?.meta?.title}</title>
  <meta name="description" content={data?.meta?.description} />
  <meta name="theme-color" content={data?.meta?.themeColor} />
  <meta property="og:title" content={data?.meta?.title} />
  <meta property="og:description" content={data?.meta?.description} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={"/meta.gif"} />
</svelte:head>

{@render children?.()}

<style lang="postcss">
  @reference "tailwindcss";

  :global(body) {
    @apply bg-black 
    bg-[linear-gradient(135deg,#101018_0%,#0d0d12_50%,#000000_100%)] 
    bg-fixed bg-no-repeat 
    text-[#e0e0e0] 
    font-sans 
    m-0;
  }
</style>
