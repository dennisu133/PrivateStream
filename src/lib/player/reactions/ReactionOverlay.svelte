<script lang="ts">
	import { fade } from "svelte/transition";
	import type { Reaction } from "./reactions";

	let { reaction }: { reaction: Reaction | null } = $props();
</script>

<!-- The key restarts the fade when the emote changes; |global because the key block,
     not the if, is what tears down on a swap, and a local transition ignores parents. -->
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
