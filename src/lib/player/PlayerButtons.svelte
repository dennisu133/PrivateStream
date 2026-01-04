<script lang="ts">
	import type { Snippet } from "svelte";
	import { autohide } from "$lib/attachments/autohide.svelte";

	let {
		frame = null,
		children
	}: {
		frame?: HTMLElement | null;
		children: Snippet;
	} = $props();

	const frameId = $derived(frame?.id ?? undefined);
</script>

<div
	class="pointer-events-auto absolute right-2.5 bottom-2.5 flex items-center gap-2.5 rounded-lg bg-black/35 px-2 py-1.5 backdrop-blur-[2px] transition-all duration-200 ease-out data-[visible=false]:invisible data-[visible=false]:translate-y-1.5 data-[visible=false]:opacity-0"
	{@attach autohide({ monitorSelector: frameId ? `#${frameId}` : undefined })}
>
	{@render children()}
</div>
