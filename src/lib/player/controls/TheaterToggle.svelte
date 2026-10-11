<script lang="ts">
	import { FoldHorizontal, UnfoldHorizontal } from "@lucide/svelte";
	import Button from "./Button.svelte";
	import { dispatchAutohide } from "$lib/attachments/autohide";

	// Theater mode fills the browser viewport with CSS and leaves the browser UI alone,
	// unlike the Fullscreen API. target is only the autohide monitor here.
	let {
		target = null,
		theater = $bindable(false)
	}: {
		target?: HTMLElement | null;
		theater?: boolean;
	} = $props();

	const toggleTheater = () => {
		theater = !theater;
		dispatchAutohide(target, "autohide:show");
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

		// Escape types nothing, so it also works from the overlay chat input. While
		// fullscreen it belongs to the browser, which exits back into theater.
		if (event.key === "Escape") {
			if (!theater || document.fullscreenElement) return;
			event.preventDefault();
			toggleTheater();
			return;
		}

		if (event.key !== "t" && event.key !== "T") return;

		const targetEl = event.target as HTMLElement | null;
		if (targetEl?.matches("input, textarea, select, [contenteditable]")) {
			return;
		}

		event.preventDefault();
		toggleTheater();
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<Button
	label={theater ? "Exit theater mode" : "Theater mode"}
	title={(theater ? "Exit theater mode" : "Theater mode") + " (t)"}
	aria-keyshortcuts="t"
	aria-pressed={theater}
	onclick={toggleTheater}
>
	{#if theater}
		<FoldHorizontal size={24} strokeWidth={2} aria-hidden="true" />
	{:else}
		<UnfoldHorizontal size={24} strokeWidth={2} aria-hidden="true" />
	{/if}
</Button>
