<script lang="ts">
	import catchipGif from "$lib/assets/catchip.webp";
	import { explode } from "$lib/effects/explosion";

	let isGifVisible = $state(true);
	let detonating = false;

	function handleGifClick(event: MouseEvent) {
		if (detonating) return;
		detonating = true;

		// Hide the cat after the explosion effect is done
		explode(event.clientX, event.clientY, {
			onFinale: () => (isGifVisible = false)
		});
	}
</script>

{#if isGifVisible}
	<button
		type="button"
		onclick={handleGifClick}
		class="fixed right-5 bottom-5 z-60 cursor-pointer bg-transparent transition-transform duration-300 ease-cinema hover:scale-110"
	>
		<img
			fetchpriority="low"
			loading="lazy"
			decoding="async"
			src={catchipGif}
			alt="cat eating chips"
			class="opacity-70"
			width="112"
			height="112"
		/>
	</button>
{/if}
