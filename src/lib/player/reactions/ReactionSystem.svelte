<script lang="ts">
	import { onMount } from "svelte";
	import ReactionMenu from "./ReactionMenu.svelte";
	import ReactionOverlay from "./ReactionOverlay.svelte";
	import {
		reactions,
		subscribeToReactions,
		type Reaction,
		type ReactionEvent
	} from "./reactions.svelte";

	const OVERLAY_DURATION = 1500;

	let {
		frameEl = null
	}: {
		frameEl?: HTMLElement | null;
	} = $props();

	// Menu state
	let menuOpen = $state(false);
	let toggleButtonEl = $state<HTMLElement | null>(null);

	// Overlay state
	let activeReaction = $state<Reaction | null>(null);
	let overlayTimer: ReturnType<typeof setTimeout> | null = null;

	function dispatchAutohide(event: string) {
		frameEl?.dispatchEvent(new CustomEvent(event, { bubbles: true }));
	}

	export function toggle() {
		menuOpen = !menuOpen;
		dispatchAutohide(menuOpen ? "autohide:hold" : "autohide:release");
	}

	function closeMenu() {
		if (menuOpen) {
			menuOpen = false;
			dispatchAutohide("autohide:release");
		}
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

	function handleRemoteReaction(event: ReactionEvent) {
		showOverlay(event);
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.target as HTMLElement).matches("input, textarea, [contenteditable]")) return;
		if (event.key.toLowerCase() === "r") {
			event.preventDefault();
			toggle();
			dispatchAutohide("autohide:show");
		}
	}

	export function isOpen() {
		return menuOpen;
	}

	export function interact() {
		dispatchAutohide("autohide:show");
	}

	export function setToggleButtonEl(el: HTMLElement | null) {
		toggleButtonEl = el;
	}

	onMount(() => {
		const unsubscribe = subscribeToReactions(handleRemoteReaction);

		// Preload reaction images
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

<!-- Menu positioned in player frame -->
{#if menuOpen}
	<div
		class="absolute right-2 bottom-14 z-40 flex max-h-[calc(100%-4rem)] w-64 flex-col justify-end"
	>
		<ReactionMenu
			{toggleButtonEl}
			onSelect={handleReactionSelect}
			onClose={closeMenu}
			onInteract={() => dispatchAutohide("autohide:show")}
		/>
	</div>
{/if}

<!-- Overlay always visible (outside PlayerButtons) -->
<ReactionOverlay reaction={activeReaction} />
