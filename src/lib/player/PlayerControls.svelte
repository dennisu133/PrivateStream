<script lang="ts">
	import { onMount, tick } from "svelte";
	import { MessageSquareOff, MessageSquareText, SmilePlus } from "@lucide/svelte";
	import { autohide, dispatchAutohide } from "$lib/attachments/autohide";
	import Button from "./controls/Button.svelte";
	import FullscreenToggle from "./controls/FullscreenToggle.svelte";
	import VolumeControls from "./controls/VolumeControls.svelte";
	import ReactionMenu from "./reactions/ReactionMenu.svelte";
	import ReactionOverlay from "./reactions/ReactionOverlay.svelte";
	import ChatOverlay from "./ChatOverlay.svelte";
	import ChatInput from "./ChatInput.svelte";
	import { reactions, subscribeToReactions, type Reaction } from "./reactions/reactions";

	const OVERLAY_DURATION = 1500;

	let {
		frame = null,
		video = null,
		chatInput = null,
		chatDraft = $bindable(""),
		enableReactions = true,
		controlsWidth = $bindable(0)
	}: {
		frame?: HTMLElement | null;
		video?: HTMLVideoElement | null;
		chatInput?: HTMLInputElement | null;
		chatDraft?: string;
		enableReactions?: boolean;
		controlsWidth?: number;
	} = $props();

	let menuOpen = $state(false);
	let chatVisible = $state(true);
	let fullscreenElement = $state<Element | null>(null);
	let fullscreenChatInput = $state<HTMLInputElement | null>(null);
	let toggleButtonEl = $state<HTMLButtonElement | null>(null);
	let activeReaction = $state<Reaction | null>(null);
	let overlayTimer: ReturnType<typeof setTimeout> | undefined;

	function toggleMenu() {
		menuOpen = !menuOpen;
		dispatchAutohide(frame, menuOpen ? "autohide:hold" : "autohide:release");
	}

	function closeMenu() {
		if (!menuOpen) return;
		menuOpen = false;
		dispatchAutohide(frame, "autohide:release");
	}

	function showOverlay(reaction: Reaction) {
		activeReaction = reaction;
		clearTimeout(overlayTimer);
		overlayTimer = setTimeout(() => (activeReaction = null), OVERLAY_DURATION);
	}

	function handleReactionSelect(reaction: Reaction) {
		closeMenu();
		showOverlay(reaction);
	}

	async function handleKeydown(event: KeyboardEvent) {
		if (!enableReactions || event.defaultPrevented || event.isComposing || event.repeat) return;
		// Leave browser shortcuts and text entry alone.
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest("input, textarea, select, [contenteditable]")) return;
		const key = event.key.toLowerCase();
		if (key === "r") {
			event.preventDefault();
			toggleMenu();
		} else if (key === "h") {
			event.preventDefault();
			chatVisible = !chatVisible;
			dispatchAutohide(frame, "autohide:show");
		} else if (key === "c") {
			const inFullscreen = frame !== null && fullscreenElement === frame;
			if (!inFullscreen && !chatInput) return;
			event.preventDefault();
			closeMenu();
			if (inFullscreen) chatVisible = true;
			await tick();
			(inFullscreen ? fullscreenChatInput : chatInput)?.focus();
			dispatchAutohide(frame, "autohide:show");
		}
	}

	onMount(() => {
		if (!enableReactions) return;

		const unsubscribe = subscribeToReactions(showOverlay);
		// An incoming reaction appears with no warning, so have them cached before then.
		for (const reaction of reactions) new Image().src = reaction.url;

		return () => {
			unsubscribe();
			clearTimeout(overlayTimer);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document bind:fullscreenElement />

{#if enableReactions}
	{#if chatVisible}
		<ChatOverlay />
		{#if frame && fullscreenElement === frame}
			<div
				class="absolute bottom-3 left-3 z-30 w-80 max-w-[calc(100%-1.5rem)] rounded-sm border border-border bg-background/55 px-3 py-2 backdrop-blur-md transition-[opacity,translate] duration-300 ease-out-expo data-[visible=false]:pointer-events-none data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0 @max-[44rem]:bottom-18"
				{@attach autohide()}
			>
				<ChatInput overlay bind:text={chatDraft} bind:ref={fullscreenChatInput} />
			</div>
		{/if}
	{/if}
	{#if menuOpen}
		<div class="absolute right-2 bottom-14 z-40 flex max-h-[calc(100%-4rem)] w-64 flex-col">
			<ReactionMenu {toggleButtonEl} onSelect={handleReactionSelect} onClose={closeMenu} />
		</div>
	{/if}

	<ReactionOverlay reaction={activeReaction} />
{/if}

<div
	bind:offsetWidth={controlsWidth}
	class="absolute right-3 bottom-3 z-30 flex w-max items-center gap-3 rounded-sm border border-border bg-background/55 px-3 py-2 backdrop-blur-md transition-[opacity,translate] duration-300 ease-out-expo data-[visible=false]:pointer-events-none data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0"
	{@attach autohide()}
>
	{#if enableReactions}
		<Button
			label="Chat messages"
			title={chatVisible ? "Hide chat messages (h)" : "Show chat messages (h)"}
			aria-keyshortcuts="h"
			aria-pressed={chatVisible}
			onclick={() => (chatVisible = !chatVisible)}
		>
			{#if chatVisible}
				<MessageSquareText size={24} aria-hidden="true" />
			{:else}
				<MessageSquareOff size={24} aria-hidden="true" />
			{/if}
		</Button>
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
