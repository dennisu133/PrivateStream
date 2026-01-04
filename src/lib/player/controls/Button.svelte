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
	class="grid h-8 w-8 cursor-pointer place-items-center rounded-md bg-transparent outline-hidden transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
	aria-label={label}
	aria-pressed={pressed}
	{title}
	{disabled}
	{onclick}
	{...restProps}
>
	{@render children()}
</button>
