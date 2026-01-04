<script lang="ts">
	import { Maximize, Minimize } from "@lucide/svelte";
	import Button from "./Button.svelte";

	let {
		target = null
	}: {
		target?: HTMLElement | null;
	} = $props();

	let isFullscreen = $state(false);
	let buttonEl = $state<HTMLElement | null>(null);

	const dispatchShow = () => {
		buttonEl?.dispatchEvent(new CustomEvent("autohide:show", { bubbles: true }));
	};

	const syncFullscreen = () => {
		if (typeof document === "undefined") {
			isFullscreen = false;
			return;
		}
		isFullscreen = document.fullscreenElement === target;
	};

	const toggleFullscreen = async () => {
		if (!target || typeof document === "undefined") return;

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
			syncFullscreen();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key !== "f" && event.key !== "F") return;

		const targetEl = event.target as HTMLElement | null;
		if (targetEl?.matches("input, textarea, select, [contenteditable]")) {
			return;
		}

		if (!target) return;
		event.preventDefault();
		toggleFullscreen();
	};

	$effect(() => {
		syncFullscreen();

		if (typeof document === "undefined") return;

		document.addEventListener("fullscreenchange", syncFullscreen);
		return () => document.removeEventListener("fullscreenchange", syncFullscreen);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<span bind:this={buttonEl}>
	<Button
		label={isFullscreen ? "Exit full screen" : "Full screen"}
		title={(isFullscreen ? "Exit full screen" : "Full screen") + " (f)"}
		pressed={isFullscreen}
		onclick={toggleFullscreen}
	>
		{#if isFullscreen}
			<Minimize size={24} strokeWidth={2} aria-hidden="true" />
		{:else}
			<Maximize size={24} strokeWidth={2} aria-hidden="true" />
		{/if}
	</Button>
</span>
