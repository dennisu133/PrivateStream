<script lang="ts">
	import type { ReactionItem } from "./reaction-service.svelte";

	let {
		reactions = [],
		onSelect,
		onClose,
		onInteract,
		isDisabled = false
	}: {
		reactions?: ReactionItem[];
		onSelect: (item: ReactionItem) => void;
		onClose: () => void;
		onInteract?: () => void;
		isDisabled?: boolean;
	} = $props();

	let selectedIndex = $state(0);
	let gridEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!isDisabled && reactions.length > 0) {
			gridEl?.focus();
		}
	});

	$effect(() => {
		if (selectedIndex >= reactions.length) selectedIndex = 0;
		const target = gridEl?.children[selectedIndex] as HTMLElement;
		target?.scrollIntoView({ block: "nearest", inline: "nearest" });
	});

	function handleKeydown(e: KeyboardEvent) {
		if (isDisabled || !reactions.length) return;

		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSelect(reactions[selectedIndex]);
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + reactions.length) % reactions.length;
			onInteract?.();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % reactions.length;
			onInteract?.();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const cols = Math.floor((gridEl?.clientWidth ?? 0) / 96) || 1;
			selectedIndex = Math.max(0, selectedIndex - cols);
			onInteract?.();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			const cols = Math.floor((gridEl?.clientWidth ?? 0) / 96) || 1;
			selectedIndex = Math.min(reactions.length - 1, selectedIndex + cols);
			onInteract?.();
		}
	}
</script>

{#if !isDisabled && reactions.length > 0}
	<div
		role="listbox"
		tabindex="0"
		class="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2 p-3 outline-hidden"
		bind:this={gridEl}
		onkeydown={handleKeydown}
	>
		{#each reactions as r, i (r.id)}
			<button
				type="button"
				class="flex cursor-pointer flex-col gap-2 rounded-sm border border-white/10 bg-white/5 p-2 leading-tight text-white hover:bg-white/10
					{i === selectedIndex ? 'bg-white/10 ring-2 ring-white/70' : ''}"
				onclick={() => {
					onInteract?.();
					onSelect(r);
				}}
				role="option"
				aria-selected={i === selectedIndex}
				title={r.name}
			>
				<img
					class="pointer-events-none h-12 object-contain select-none"
					src={r.url}
					alt={r.name}
					loading="lazy"
				/>
				<span class="truncate text-center text-xs">{r.name}</span>
			</button>
		{/each}
	</div>
{/if}
