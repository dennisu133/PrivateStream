<script lang="ts">
	import { reactions, triggerReaction, type Reaction } from "./reactions";

	/** Matches grid-cols-3 below; drives Up/Down stepping. */
	const COLUMNS = 3;

	let {
		toggleButtonEl = null,
		onSelect,
		onClose
	}: {
		toggleButtonEl?: HTMLButtonElement | null;
		onSelect: (reaction: Reaction) => void;
		onClose: () => void;
	} = $props();

	let selectedIndex = $state(0);
	let menuEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const opened = menuEl;
		if (!opened) return;
		opened.focus();

		return () => {
			// Hand focus back to the trigger, but only if the menu still holds it:
			// closing by clicking another control must not steal focus from it.
			const active = document.activeElement;
			if (active === opened || active === document.body) {
				toggleButtonEl?.focus();
			}
		};
	});

	// Capture, so a click on the toggle button reaches this before the button's own handler.
	$effect(() => {
		const onDocumentClick = ({ target }: MouseEvent) => {
			const node = target as Node;
			if (!menuEl?.contains(node) && !toggleButtonEl?.contains(node)) onClose();
		};
		document.addEventListener("click", onDocumentClick, true);
		return () => document.removeEventListener("click", onDocumentClick, true);
	});

	$effect(() => {
		menuEl?.children[selectedIndex]?.scrollIntoView({ block: "nearest" });
	});

	function handleSelect(reaction: Reaction) {
		onSelect(reaction);
		triggerReaction(reaction.id).catch((e) => console.error("Failed to trigger reaction:", e));
	}

	function step(delta: number) {
		selectedIndex = (selectedIndex + delta + reactions.length) % reactions.length;
	}

	function handleArrowKey(key: string) {
		if (key === "ArrowLeft") step(-1);
		else if (key === "ArrowRight") step(1);
		else if (key === "ArrowUp") selectedIndex = Math.max(0, selectedIndex - COLUMNS);
		else if (key === "ArrowDown")
			selectedIndex = Math.min(reactions.length - 1, selectedIndex + COLUMNS);
		else return false;
		return true;
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleSelect(reactions[selectedIndex]);
		} else if (e.key === "Tab") {
			// The options are not tab stops, so Tab steps the selection here. Without
			// this the browser moved focus into an option while selectedIndex stayed
			// put, and Enter then fired whichever reaction the ring was still on.
			e.preventDefault();
			step(e.shiftKey ? -1 : 1);
		} else if (handleArrowKey(e.key)) {
			e.preventDefault();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		// The focused menu handles its own keys; otherwise intercept arrows before VolumeControls.
		if (menuEl?.contains(document.activeElement)) return;
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		} else if (handleArrowKey(e.key)) {
			e.preventDefault();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
	bind:this={menuEl}
	role="listbox"
	tabindex="0"
	aria-activedescendant="reaction-option-{selectedIndex}"
	class="theater-scrollbar grid min-h-0 grid-cols-3 gap-2 overflow-y-auto rounded-md border border-theater-border bg-theater-black/85 p-3 outline-hidden backdrop-blur-sm"
	onkeydown={handleMenuKeydown}
>
	{#each reactions as r, i (r.id)}
		<button
			type="button"
			id="reaction-option-{i}"
			role="option"
			tabindex="-1"
			aria-selected={i === selectedIndex}
			title={r.name}
			class="flex cursor-pointer flex-col gap-1.5 rounded-sm border border-theater-border bg-theater-gold/5 p-2 leading-tight text-theater-paper hover:bg-theater-gold/10 aria-selected:bg-theater-gold/10 aria-selected:ring-2 aria-selected:ring-theater-gold/70"
			onclick={() => handleSelect(r)}
		>
			<img
				class="pointer-events-none h-10 w-full object-contain select-none"
				src={r.url}
				alt=""
				loading="lazy"
			/>
			<span class="truncate text-center text-xs">{r.name}</span>
		</button>
	{/each}
</div>

<style>
	.theater-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in oklch, var(--color-theater-gold) 30%, transparent) transparent;
	}
</style>
