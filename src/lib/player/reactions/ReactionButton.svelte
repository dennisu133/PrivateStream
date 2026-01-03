<script lang="ts">
	import { asset } from "$app/paths";
	import { Sticker } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import ReactionMenu from "./ReactionMenu.svelte";
	import {
		getCachedReactions,
		loadReactions,
		subscribeToReactions,
		triggerReaction,
		type ReactionItem
	} from "./reaction-service.svelte";

	let {
		player = null,
		stage = null,
		playerSize = null,
		overlayImages = null,
		overlayDuration = 1000,
		suspendVolumeKeys = null,
		onRevealControls,
		onMenuOpen,
		onMenuClose
	}: {
		player?: HTMLElement | null;
		stage?: HTMLElement | null;
		playerSize?: { width: number; height: number } | null;
		overlayImages?: string[] | null;
		overlayDuration?: number;
		suspendVolumeKeys?: (() => () => void) | null;
		onRevealControls?: () => void;
		onMenuOpen?: () => void;
		onMenuClose?: () => void;
	} = $props();

	const host = $derived(stage ?? player);
	let isOpen = $state(false);
	let reactions = $state<ReactionItem[]>([]);
	let activeOverlay = $state<ReactionItem | null>(null);
	let overlayEl = $state<HTMLElement | null>(null);
	let overlayTimer: number | null = null;
	let releaseKeys: (() => void) | null = null;

	const overlayUrl = $derived(
		activeOverlay?.url ?? (overlayImages?.[0] ? asset(overlayImages[0]) : null)
	);

	// Calculate max height leaving space for controls and a top margin
	const menuMaxHeight = $derived(playerSize ? Math.max(140, playerSize.height - 100) : 320);

	async function init() {
		reactions = getCachedReactions() ?? (await loadReactions().catch(() => []));
		reactions.forEach((r) => (new Image().src = r.url));
	}

	function toggle() {
		if (isOpen) close();
		else open();
	}

	function open() {
		if (isOpen) return;
		isOpen = true;
		init();
		releaseKeys = suspendVolumeKeys?.() ?? null;
		onMenuOpen?.();
		onRevealControls?.();
	}

	function close() {
		if (!isOpen) return;
		isOpen = false;
		releaseKeys?.();
		releaseKeys = null;
		onMenuClose?.();
	}

	function showOverlay(item: ReactionItem) {
		activeOverlay = item;
		if (overlayTimer) clearTimeout(overlayTimer);
		if (typeof window !== "undefined") {
			overlayTimer = window.setTimeout(() => {
				activeOverlay = null;
				overlayTimer = null;
			}, overlayDuration);
		}
	}

	function handleSelect(item: ReactionItem) {
		showOverlay(item);
		triggerReaction(item).catch(console.error);
		close();
	}

	$effect(() => {
		if (activeOverlay && overlayEl && host) {
			host.appendChild(overlayEl);
		}
	});

	$effect(() =>
		subscribeToReactions((sig) => {
			if (sig.origin === "remote") showOverlay(sig.reaction);
		})
	);

	$effect(() => {
		if (typeof window === "undefined") return;
		const onKey = (e: KeyboardEvent) => {
			if ((e.target as HTMLElement).matches("input, textarea, [contenteditable]")) return;
			if (e.key.toLowerCase() === "r") {
				e.preventDefault();
				toggle();
				onRevealControls?.();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
</script>

<button
	type="button"
	class="player-button"
	aria-label="Reactions"
	aria-expanded={isOpen}
	onclick={toggle}
>
	<Sticker size={24} />
</button>

{#if isOpen}
	<div
		class="absolute right-0 bottom-full z-50 mb-2 w-[min(320px,80vw)] overflow-auto rounded-md bg-black/80 shadow-lg"
		style:max-height={`${menuMaxHeight}px`}
	>
		{#if reactions.length === 0}
			<div class="p-2 text-sm text-white/70">Loading...</div>
		{:else}
			<ReactionMenu
				{reactions}
				onSelect={handleSelect}
				onClose={close}
				onInteract={onRevealControls}
			/>
		{/if}
	</div>
{/if}

{#if activeOverlay}
	<div
		class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
		bind:this={overlayEl}
		onclick={() => (activeOverlay = null)}
		role="presentation"
		aria-hidden="true"
		transition:fade={{ duration: 200 }}
	>
		<img
			src={overlayUrl}
			alt="Reaction"
			class="max-h-[45%] max-w-[45%] object-contain drop-shadow-lg"
		/>
	</div>
{/if}
