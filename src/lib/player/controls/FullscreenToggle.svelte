<script lang="ts">
	import { Maximize, Minimize } from "@lucide/svelte";
	import Button from "./Button.svelte";
	import { dispatchAutohide } from "$lib/attachments/autohide";

	let {
		target = null
	}: {
		target?: HTMLElement | null;
	} = $props();

	let fullscreenElement = $state<Element | null>(null);
	const isFullscreen = $derived(target !== null && fullscreenElement === target);

	// target is the frame, which is the autohide monitor itself.
	const dispatchShow = () => dispatchAutohide(target, "autohide:show");

	const toggleFullscreen = async () => {
		if (!target) return;

		try {
			if (document.fullscreenElement === target) {
				await document.exitFullscreen();
			} else {
				await target.requestFullscreen();
			}
		} catch (error) {
			console.error("Fullscreen error:", error);
		} finally {
			dispatchShow();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		// Ctrl/Cmd+F is find-in-page; without this the hotkey swallows it.
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.key !== "f" && event.key !== "F") return;

		const targetEl = event.target as HTMLElement | null;
		if (targetEl?.matches("input, textarea, select, [contenteditable]")) {
			return;
		}

		if (!target) return;
		event.preventDefault();
		toggleFullscreen();
	};
</script>

<svelte:document bind:fullscreenElement />

<svelte:window onkeydown={handleKeydown} />

<Button
	label={isFullscreen ? "Exit full screen" : "Full screen"}
	title={(isFullscreen ? "Exit full screen" : "Full screen") + " (f)"}
	onclick={toggleFullscreen}
>
	{#if isFullscreen}
		<Minimize size={24} strokeWidth={2} aria-hidden="true" />
	{:else}
		<Maximize size={24} strokeWidth={2} aria-hidden="true" />
	{/if}
</Button>
