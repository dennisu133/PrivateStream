<script lang="ts">
	import { reactions, triggerReaction, type Reaction } from "./reactions.svelte";

	const COLUMNS = 3;

	let {
		toggleButtonEl = null,
		onSelect,
		onClose
	}: {
		toggleButtonEl?: HTMLElement | null;
		onSelect: (reaction: Reaction) => void;
		onClose: () => void;
	} = $props();

	let selectedIndex = $state(0);
	let containerEl = $state<HTMLDivElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!menuEl) return;
		const opened = menuEl;
		opened.focus();

		return () => {
			// Hand focus back to the trigger, but only if the menu still holds it:
			// closing by clicking another control must not steal focus from it.
			const active = document.activeElement;
			if (active === opened || active === document.body) {
				toggleButtonEl?.querySelector("button")?.focus();
			}
		};
	});

	$effect(() => {
		if (selectedIndex >= reactions.length) selectedIndex = 0;
		const target = menuEl?.children[selectedIndex] as HTMLElement;
		target?.scrollIntoView({ block: "nearest", inline: "nearest" });
	});

	async function handleSelect(reaction: Reaction) {
		onSelect(reaction);

		try {
			await triggerReaction(reaction.id);
		} catch (error) {
			console.error("Failed to trigger reaction:", error);
		}
	}

	function handleArrowKey(key: string) {
		if (!reactions.length) return false;

		if (key === "ArrowLeft") {
			selectedIndex = (selectedIndex - 1 + reactions.length) % reactions.length;
			return true;
		} else if (key === "ArrowRight") {
			selectedIndex = (selectedIndex + 1) % reactions.length;
			return true;
		} else if (key === "ArrowUp") {
			selectedIndex = Math.max(0, selectedIndex - COLUMNS);
			return true;
		} else if (key === "ArrowDown") {
			selectedIndex = Math.min(reactions.length - 1, selectedIndex + COLUMNS);
			return true;
		}
		return false;
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (!reactions.length) return;

		if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleSelect(reactions[selectedIndex]);
		} else if (handleArrowKey(e.key)) {
			e.preventDefault();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
			return;
		}

		// The focused menu handles its own keys; otherwise intercept arrows before VolumeControls.
		if (menuEl && document.activeElement === menuEl) return;
		if (handleArrowKey(e.key)) {
			e.preventDefault();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (toggleButtonEl?.contains(target)) {
			return;
		}
		if (containerEl && !containerEl.contains(target)) {
			onClose();
		}
	}

	// Capture clicks before the toggle button handles them.
	$effect(() => {
		document.addEventListener("click", handleClickOutside, true);
		return () => {
			document.removeEventListener("click", handleClickOutside, true);
		};
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
	bind:this={containerEl}
	class="flex min-h-0 w-full flex-col overflow-hidden rounded-md border border-theater-gold/12 bg-black/85 backdrop-blur-sm"
>
	{#if reactions.length > 0}
		<div
			role="listbox"
			tabindex="0"
			class="theater-scrollbar grid min-h-0 auto-rows-max grid-cols-3 gap-2 overflow-y-auto p-3 outline-hidden"
			bind:this={menuEl}
			onkeydown={handleMenuKeydown}
		>
			{#each reactions as r, i (r.id)}
				<button
					type="button"
					class="flex cursor-pointer flex-col gap-1.5 rounded-sm border border-theater-gold/12 bg-theater-gold/5 p-2 leading-tight text-theater-paper hover:bg-theater-gold/10
						{i === selectedIndex ? 'bg-theater-gold/10 ring-2 ring-theater-gold/70' : ''}"
					onclick={(e) => {
						e.stopPropagation();
						handleSelect(r);
					}}
					role="option"
					aria-selected={i === selectedIndex}
					title={r.name}
				>
					<img
						class="pointer-events-none h-10 w-full object-contain select-none"
						src={r.url}
						alt={r.name}
						loading="lazy"
					/>
					<span class="w-full truncate text-center text-xs">{r.name}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Firefox uses standard properties. Chromium and Safari need pseudo-elements
	   for a 6px bar without stepper buttons. */
	@supports not selector(::-webkit-scrollbar) {
		.theater-scrollbar {
			scrollbar-width: thin;
			scrollbar-color: color-mix(in oklch, var(--color-theater-gold) 30%, transparent) transparent;
		}
	}
	.theater-scrollbar::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	.theater-scrollbar::-webkit-scrollbar-track,
	.theater-scrollbar::-webkit-scrollbar-corner {
		background: transparent;
	}
	.theater-scrollbar::-webkit-scrollbar-thumb {
		background: color-mix(in oklch, var(--color-theater-gold) 30%, transparent);
		border-radius: 3px;
	}
	.theater-scrollbar::-webkit-scrollbar-thumb:hover {
		background: color-mix(in oklch, var(--color-theater-gold) 55%, transparent);
	}
</style>
