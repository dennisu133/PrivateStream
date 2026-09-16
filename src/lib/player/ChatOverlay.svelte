<script lang="ts">
	import { subscribeToEvents } from "./events";

	let announcement = $state<{ text: string } | null>(null);

	function ticker(layer: HTMLDivElement) {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let width = 0;
		let height = 0;
		let lineHeight = 0;
		let availableAt: number[] = [];
		let pending: { text: string; receivedAt: number }[] = [];
		const active = new Set<Animation>();

		function clear() {
			for (const animation of active) animation.cancel();
			active.clear();
			layer.replaceChildren();
			pending = [];
			availableAt.fill(0);
		}

		function resize() {
			const bounds = layer.getBoundingClientRect();
			if (bounds.width === width && bounds.height === height) return;
			clear();
			width = bounds.width;
			height = bounds.height;
			const fontSize = Math.max(16, Math.min(24, width / 40));
			lineHeight = fontSize * 1.5;
			layer.style.fontSize = `${fontSize}px`;
			layer.style.lineHeight = `${lineHeight}px`;
			availableAt = Array(Math.max(0, Math.floor((height * 0.7 - 24) / lineHeight))).fill(0);
		}

		function flush() {
			const now = performance.now();
			pending = pending.filter((message) => now - message.receivedAt < 2000);
			if (document.hidden || width <= 0) return;

			while (pending.length && active.size < 60) {
				const freeLanes = availableAt.flatMap((time, index) => (time <= now ? [index] : []));
				if (!freeLanes.length) return;
				const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
				const message = pending.shift()!;
				const element = document.createElement("span");
				// Plain text only: chat never becomes HTML, and line breaks cannot cross lanes.
				element.textContent = message.text.replace(/\s+/gu, " ");
				element.style.top = `${12 + lane * lineHeight}px`;
				layer.append(element);
				const messageWidth = element.getBoundingClientRect().width;
				const speed = width / 8000;
				const duration = reducedMotion.matches ? 4000 : (width + messageWidth) / speed;
				// Equal speeds preserve this gap for the entire trip, regardless of text length.
				availableAt[lane] = now + (reducedMotion.matches ? duration : (messageWidth + 24) / speed);
				const animation = element.animate(
					reducedMotion.matches
						? [
								{ opacity: 0, offset: 0 },
								{ opacity: 1, offset: 0.05 },
								{ opacity: 1, offset: 0.95 },
								{ opacity: 0, offset: 1 }
							]
						: [{ transform: "translateX(-100%)" }, { transform: `translateX(${width}px)` }],
					{ duration, easing: "linear", fill: "forwards" }
				);
				active.add(animation);
				animation.onfinish = () => {
					element.remove();
					active.delete(animation);
					animation.cancel();
				};
			}
		}

		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(layer);
		reducedMotion.addEventListener("change", clear);
		document.addEventListener("visibilitychange", clear);
		const unsubscribe = subscribeToEvents((event) => {
			if (event.type !== "chat" || document.hidden) return;
			announcement = { text: event.text };
			if (pending.length === 20) pending.shift();
			pending.push({ text: event.text, receivedAt: performance.now() });
			flush();
		});
		const timer = setInterval(flush, 100);

		return () => {
			unsubscribe();
			clearInterval(timer);
			observer.disconnect();
			reducedMotion.removeEventListener("change", clear);
			document.removeEventListener("visibilitychange", clear);
			clear();
		};
	}
</script>

<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
	{#key announcement}
		{#if announcement}<span>{announcement.text}</span>{/if}
	{/key}
</div>
<div class="chat-overlay" aria-hidden="true" {@attach ticker}></div>

<style>
	.chat-overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
		color: white;
		font-weight: 600;
		text-shadow: 0 1px 3px black;
		-webkit-text-stroke: 2px black;
		paint-order: stroke fill;
	}

	.chat-overlay :global(span) {
		position: absolute;
		left: 0;
		width: max-content;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.chat-overlay :global(span) {
			left: 12px;
			max-width: calc(100% - 24px);
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
</style>
