<script lang="ts">
	import { fade } from "svelte/transition";
	import type { Reaction } from "$lib/reactions.remote";

	let { reaction }: { reaction: Reaction | null } = $props();
</script>

{#if reaction}
	<div
		class="pointer-events-none absolute right-[20cqw] bottom-[20cqh] z-50"
		role="presentation"
		aria-hidden="true"
		transition:fade={{ duration: 200 }}
	>
		<img
			src={reaction.url}
			alt={reaction.name}
			class="size-[clamp(60px,18cqmin,120px)] object-contain drop-shadow-lg"
		/>
	</div>
{/if}
