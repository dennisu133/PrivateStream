<script lang="ts">
	import { fade } from "svelte/transition";
	import type { Reaction } from "./reactions.svelte";

	let { reaction }: { reaction: Reaction | null } = $props();
</script>

<!-- Key by id, not object: the server echoes reactions back to their sender as a fresh
     object. |global because the key block, not the if, is what tears down on a swap. -->
{#key reaction?.id}
	{#if reaction}
		<!-- Offsets and size resolve against the video frame (@container-size in Player.svelte). -->
		<img
			src={reaction.url}
			alt=""
			aria-hidden="true"
			class="pointer-events-none absolute right-[20cqw] bottom-[20cqh] z-50 size-[clamp(60px,18cqmin,120px)] object-contain drop-shadow-lg"
			transition:fade|global={{ duration: 200 }}
		/>
	{/if}
{/key}
