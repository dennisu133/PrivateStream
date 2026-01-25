<script lang="ts">
	import { reactions, triggerReaction, type Reaction } from "./reactions.svelte";

	const COLUMNS = 3;

	let {
		toggleButtonEl = null,
		onSelect,
		onClose,
		onInteract
	}: {
		toggleButtonEl?: HTMLElement | null;
		onSelect: (reaction: Reaction) => void;
		onClose: () => void;
		onInteract?: () => void;
	} = $props();

	let selectedIndex = $state(0);
	let containerEl = $state<HTMLDivElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);

	// Focus menu when it becomes available
	$effect(() => {
		if (menuEl) {
			menuEl.focus();
		}
	});

	// Keep selection in bounds and scroll into view
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
			onInteract?.();
			return true;
		} else if (key === "ArrowRight") {
			selectedIndex = (selectedIndex + 1) % reactions.length;
			onInteract?.();
			return true;
		} else if (key === "ArrowUp") {
			selectedIndex = Math.max(0, selectedIndex - COLUMNS);
			onInteract?.();
			return true;
		} else if (key === "ArrowDown") {
			selectedIndex = Math.min(reactions.length - 1, selectedIndex + COLUMNS);
			onInteract?.();
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

		// Handle arrow keys globally (steal from VolumeControls)
		// Only process if menu element doesn't have focus (to avoid double-handling)
		if (menuEl && document.activeElement === menuEl) return;
		if (handleArrowKey(e.key)) {
			e.preventDefault();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// Ignore clicks on the toggle button (let it handle its own toggle)
		if (toggleButtonEl?.contains(target)) {
			return;
		}
		// Check if click is outside the container (includes the whole menu panel)
		if (containerEl && !containerEl.contains(target)) {
			onClose();
		}
	}

	// Register click outside handler (capture phase to catch clicks before they bubble)
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
	class="flex h-full w-full flex-col overflow-hidden rounded-md bg-black/80 shadow-lg backdrop-blur-sm"
>
	{#if reactions.length > 0}
		<div
			role="listbox"
			tabindex="0"
			class="grid h-full auto-rows-max grid-cols-3 gap-2 overflow-y-auto p-3 outline-hidden"
			bind:this={menuEl}
			onkeydown={handleMenuKeydown}
		>
			{#each reactions as r, i (r.id)}
				<button
					type="button"
					class="flex cursor-pointer flex-col gap-1.5 rounded-sm border border-white/10 bg-white/5 p-2 leading-tight text-white hover:bg-white/10
						{i === selectedIndex ? 'bg-white/10 ring-2 ring-white/70' : ''}"
					onclick={(e) => {
						e.stopPropagation();
						onInteract?.();
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
