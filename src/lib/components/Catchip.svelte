<!-- importing /static/catchip.gif into the bottom right corner of the page -->
<!-- and making it explode on click -->

<script lang="ts">
	import confetti from "canvas-confetti";
	import catchipGif from "$lib/assets/catchip.gif";

	let isGifVisible = $state(true);

	function handleGifClick(event: MouseEvent) {
		isGifVisible = false;

		const origin = {
			x: event.clientX / window.innerWidth,
			y: event.clientY / window.innerHeight
		};

		confetti({
			particleCount: 150,
			spread: 90,
			origin: origin,
			colors: ["#ffc700", "#ff0000", "#ffffff", "#fdff00"]
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
			fetchpriority="high"
			src={catchipGif}
			alt="cat eating chips"
			class="opacity-70 drop-shadow-[0_0_8px_oklch(0_0_0/0.5)]"
			width="112"
			height="112"
		/>
	</button>
{/if}
