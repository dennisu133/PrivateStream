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
		class="fixed right-4 bottom-4 z-1 cursor-pointer bg-transparent hover:scale-110"
	>
		<img
			fetchpriority="high"
			src={catchipGif}
			alt="cat eating chips"
			class="opacity-80"
			width="128"
			height="128"
		/>
	</button>
{/if}
