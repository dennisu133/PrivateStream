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
	class="pointer-events-auto absolute right-3 bottom-3 flex items-center gap-3 rounded-sm border border-theater-gold/12 bg-black/55 px-3 py-2 backdrop-blur-md transition-[opacity,transform,visibility] duration-300 ease-cinema data-[visible=false]:invisible data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0"
	{@attach autohide({ monitorSelector: frameId ? `#${frameId}` : undefined })}
>
	{@render children()}
</div>
