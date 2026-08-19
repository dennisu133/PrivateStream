<script lang="ts">
	const particles = Array.from({ length: 10 }, (_, i) => ({
		left: `${Math.random() * 100}%`,
		size: `${1 + Math.random() * 2.5}px`,
		duration: `${12 + Math.random() * 20}s`,
		delay: `${-Math.random() * 20}s`,
		alt: i % 3 === 0
	}));
</script>

<div class="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
	{#each particles as p}
		<div
			class="dust-particle"
			class:alt={p.alt}
			style:left={p.left}
			style:width={p.size}
			style:height={p.size}
			style:animation-duration={p.duration}
			style:animation-delay={p.delay}
		></div>
	{/each}
</div>

<style>
	.dust-particle {
		position: absolute;
		border-radius: 50%;
		background: color-mix(in oklch, var(--color-theater-paper) 30%, transparent);
		animation: dust-float linear infinite;
	}

	.dust-particle.alt {
		animation-name: dust-float-alt;
	}

	@keyframes dust-float {
		0% {
			transform: translateY(100vh) translateX(0) scale(1);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(-10vh) translateX(30px) scale(0.5);
			opacity: 0;
		}
	}

	@keyframes dust-float-alt {
		0% {
			transform: translateY(100vh) translateX(0) rotate(0deg);
			opacity: 0;
		}
		15% {
			opacity: 0.8;
		}
		85% {
			opacity: 0.6;
		}
		100% {
			transform: translateY(-10vh) translateX(-20px) rotate(180deg);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dust-particle {
			display: none;
		}
	}
</style>
