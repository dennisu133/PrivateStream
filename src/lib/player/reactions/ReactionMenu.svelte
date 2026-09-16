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

	let tabbingAway = false;
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

	// Capture runs before the toggle button's own click handler.
	function onDocumentClick({ target }: MouseEvent) {
		const node = target as Node;
		if (!menuEl?.contains(node) && !toggleButtonEl?.contains(node)) onClose();
	}

	function handleFocusOut(event: FocusEvent) {
		// Clicking the trigger closes through its own toggle handler. Closing here
		// first would let that click immediately reopen the menu.
		if (!tabbingAway && event.relatedTarget === toggleButtonEl) return;
		if (!menuEl?.contains(event.relatedTarget as Node | null)) onClose();
	}

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

	function handleSelect(reaction: Reaction | undefined) {
		if (!reaction) return;
		onSelect(reaction);
		triggerReaction(reaction.id).catch((e) => console.error("Failed to trigger reaction:", e));
	}

	function step(delta: number) {
		if (!reactions.length) return;
		selectedIndex = (selectedIndex + delta + reactions.length) % reactions.length;
	}

	function handleArrowKey(key: string) {
		if (!reactions.length) return false;
		if (key === "ArrowLeft") step(-1);
		else if (key === "ArrowRight") step(1);
		else if (key === "ArrowUp") selectedIndex = Math.max(0, selectedIndex - COLUMNS);
		else if (key === "ArrowDown")
			selectedIndex = Math.min(reactions.length - 1, selectedIndex + COLUMNS);
		else return false;
		return true;
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		tabbingAway = e.key === "Tab";
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
</script>

<svelte:document onclickcapture={onDocumentClick} />

<div
	bind:this={menuEl}
	role="listbox"
	aria-label="Reactions"
	tabindex="0"
	aria-activedescendant="reaction-option-{selectedIndex}"
	class="theater-scrollbar grid min-h-0 grid-cols-3 gap-2 overflow-y-auto rounded-md border border-border bg-background/85 p-3 outline-hidden backdrop-blur-sm"
	onkeydown={handleMenuKeydown}
	onfocusout={handleFocusOut}
>
	{#each reactions as r, i (r.id)}
		<button
			type="button"
			id="reaction-option-{i}"
			role="option"
			tabindex="-1"
			aria-selected={i === selectedIndex}
			title={r.name}
			class="flex cursor-pointer flex-col gap-1.5 rounded-sm border border-border bg-accent/5 p-2 leading-tight text-foreground hover:bg-accent/10 aria-selected:bg-accent/10 aria-selected:ring-2 aria-selected:ring-accent/70"
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
		scrollbar-color: color-mix(in oklch, var(--color-accent) 30%, transparent) transparent;
	}
</style>
