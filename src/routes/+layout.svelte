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

<main class="flex h-screen w-screen items-center justify-center">
	{@render children?.()}
</main>
