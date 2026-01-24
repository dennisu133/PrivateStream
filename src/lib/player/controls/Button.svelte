<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	let {
		children,
		label,
		title,
		pressed,
		disabled = false,
		onclick,
		...restProps
	}: HTMLButtonAttributes & {
		children: Snippet;
		label: string;
		title?: string;
		pressed?: boolean;
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
	} = $props();
</script>

<button
	type="button"
	class="grid h-8 w-8 cursor-pointer place-items-center rounded-sm bg-transparent text-white/60 outline-hidden transition-all duration-200 ease-cinema hover:bg-white/8 hover:text-theater-gold focus-visible:ring-1 focus-visible:ring-theater-gold/40 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
	aria-label={label}
	aria-pressed={pressed}
	{title}
	{disabled}
	{onclick}
	{...restProps}
>
	{@render children()}
</button>
