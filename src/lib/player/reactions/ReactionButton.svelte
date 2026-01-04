<script lang="ts">
	import { asset } from "$app/paths";
	import { Sticker } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import Button from "../controls/Button.svelte";
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
		frame = null,
		playerSize = null,
		overlayImages = null,
		overlayDuration = 1000
	}: {
		player?: HTMLElement | null;
		frame?: HTMLElement | null;
		playerSize?: { width: number; height: number } | null;
		overlayImages?: string[] | null;
		overlayDuration?: number;
	} = $props();

	const host = $derived(frame ?? player);
	let containerEl = $state<HTMLElement | null>(null);
	let isOpen = $state(false);
	let reactions = $state<ReactionItem[]>([]);
	let activeOverlay = $state<ReactionItem | null>(null);
	let overlayEl = $state<HTMLElement | null>(null);
	let overlayTimer: number | null = null;

	const overlayUrl = $derived(
		activeOverlay?.url ?? (overlayImages?.[0] ? asset(overlayImages[0]) : null)
	);

	// Calculate max height leaving space for controls and a top margin
	const menuMaxHeight = $derived(playerSize ? Math.max(140, playerSize.height - 100) : 320);

	const dispatchShow = () => {
		containerEl?.dispatchEvent(new CustomEvent("autohide:show", { bubbles: true }));
	};

	const dispatchHold = () => {
		containerEl?.dispatchEvent(new CustomEvent("autohide:hold", { bubbles: true }));
	};

	const dispatchRelease = () => {
		containerEl?.dispatchEvent(new CustomEvent("autohide:release", { bubbles: true }));
	};

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
		dispatchHold();
		dispatchShow();
	}

	function close() {
		if (!isOpen) return;
		isOpen = false;
		dispatchRelease();
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
				dispatchShow();
			}
		};

		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
</script>

<span class="relative" bind:this={containerEl}>
	<Button label="Reactions" pressed={isOpen} onclick={toggle}>
		<Sticker size={24} />
	</Button>

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
					onInteract={dispatchShow}
				/>
			{/if}
		</div>
	{/if}
</span>

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
