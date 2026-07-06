<script lang="ts">
	import { SmilePlus } from "@lucide/svelte";
	import Button from "../controls/Button.svelte";

	let {
		isOpen = false,
		onToggle,
		onInteract,
		onMount: onMountCallback
	}: {
		isOpen?: boolean;
		onToggle: () => void;
		onInteract?: () => void;
		onMount?: (el: HTMLElement | null) => void;
	} = $props();

	let containerEl = $state<HTMLElement | null>(null);

	$effect(() => {
		onMountCallback?.(containerEl);
	});
</script>

<span bind:this={containerEl}>
	<Button
		label="Reactions (r)"
		title="Reactions (r)"
		pressed={isOpen}
		onclick={() => {
			onToggle();
			onInteract?.();
		}}
	>
		<SmilePlus size={24} />
	</Button>
</span>
