<script lang="ts">
	import { onMount } from "svelte";
	import { SmilePlus } from "@lucide/svelte";
	import { autohide } from "$lib/attachments/autohide";
	import Button from "./controls/Button.svelte";
	import FullscreenToggle from "./controls/FullscreenToggle.svelte";
	import VolumeControls from "./controls/VolumeControls.svelte";
	import ReactionMenu from "./reactions/ReactionMenu.svelte";
	import ReactionOverlay from "./reactions/ReactionOverlay.svelte";
	import { reactions, subscribeToReactions, type Reaction } from "./reactions/reactions.svelte";

	const OVERLAY_DURATION = 1500;

	let {
		frame = null,
		video = null,
		enableReactions = true
	}: {
		frame?: HTMLElement | null;
		video?: HTMLVideoElement | null;
		enableReactions?: boolean;
	} = $props();

	let menuOpen = $state(false);
	let toggleButtonEl = $state<HTMLButtonElement | null>(null);
	let activeReaction = $state<Reaction | null>(null);
	let overlayTimer: ReturnType<typeof setTimeout> | null = null;

	function dispatchAutohide(event: "autohide:hold" | "autohide:release") {
		frame?.dispatchEvent(new CustomEvent(event, { bubbles: true }));
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
		dispatchAutohide(menuOpen ? "autohide:hold" : "autohide:release");
	}

	function closeMenu() {
		if (!menuOpen) return;
		menuOpen = false;
		dispatchAutohide("autohide:release");
	}

	function showOverlay(reaction: Reaction) {
		activeReaction = reaction;
		if (overlayTimer !== null) clearTimeout(overlayTimer);
		overlayTimer = setTimeout(() => {
			activeReaction = null;
			overlayTimer = null;
		}, OVERLAY_DURATION);
	}

	function handleReactionSelect(reaction: Reaction) {
		closeMenu();
		showOverlay(reaction);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!enableReactions) return;
		// Ctrl/Cmd+R is reload; without this the hotkey opens the menu and eats it.
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.matches("input, textarea, select, [contenteditable]")) return;
		if (event.key.toLowerCase() === "r") {
			event.preventDefault();
			toggleMenu();
		}
	}

	onMount(() => {
		if (!enableReactions) return;

		const unsubscribe = subscribeToReactions(showOverlay);
		for (const reaction of reactions) {
			const img = new Image();
			img.src = reaction.url;
		}

		return () => {
			unsubscribe();
			if (overlayTimer !== null) clearTimeout(overlayTimer);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if enableReactions}
	{#if menuOpen}
		<div
			class="absolute right-2 bottom-14 z-40 flex max-h-[calc(100%-4rem)] w-64 flex-col justify-end"
		>
			<ReactionMenu {toggleButtonEl} onSelect={handleReactionSelect} onClose={closeMenu} />
		</div>
	{/if}

	<ReactionOverlay reaction={activeReaction} />
{/if}

<div
	class="absolute right-3 bottom-3 flex items-center gap-3 rounded-sm border border-theater-border bg-theater-black/55 px-3 py-2 backdrop-blur-md transition-[opacity,translate] duration-300 ease-cinema data-[visible=false]:pointer-events-none data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0"
	{@attach autohide()}
>
	{#if enableReactions}
		<Button
			bind:ref={toggleButtonEl}
			label="Reactions (r)"
			title="Reactions (r)"
			aria-haspopup="listbox"
			aria-expanded={menuOpen}
			onclick={toggleMenu}
		>
			<SmilePlus size={24} />
		</Button>
	{/if}

	<VolumeControls {video} disableGlobalInput={menuOpen} />
	<FullscreenToggle target={frame ?? video} />
</div>
