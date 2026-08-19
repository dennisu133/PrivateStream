<script lang="ts">
	import { onMount } from "svelte";
	import { Maximize, Minimize } from "@lucide/svelte";
	import Button from "./Button.svelte";

	let {
		target = null
	}: {
		target?: HTMLElement | null;
	} = $props();

	let isFullscreen = $state(false);

	const dispatchShow = () => {
		// target is the frame, which is the autohide monitor, so this lands on its
		// listener directly; from anything nested it still bubbles up to the same one.
		target?.dispatchEvent(new CustomEvent("autohide:show", { bubbles: true }));
	};

	const syncFullscreen = () => {
		isFullscreen = document.fullscreenElement === target;
	};

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

	onMount(() => {
		syncFullscreen();
		document.addEventListener("fullscreenchange", syncFullscreen);
		return () => document.removeEventListener("fullscreenchange", syncFullscreen);
	});
</script>

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
