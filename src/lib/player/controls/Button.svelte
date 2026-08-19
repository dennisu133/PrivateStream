<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	// title, disabled, onclick and the rest of the button surface already exist on
	// HTMLButtonAttributes and reach the element through restProps. Only the
	// accessible name is lifted out, so an icon-only button cannot ship unnamed.
	let {
		children,
		label,
		...restProps
	}: HTMLButtonAttributes & {
		children: Snippet;
		label: string;
	} = $props();
</script>

<button
	type="button"
	class="grid size-8 cursor-pointer place-items-center rounded-sm text-theater-muted transition-all duration-200 ease-cinema hover:bg-theater-gold/10 hover:text-theater-gold focus-visible:ring-1 focus-visible:ring-theater-gold/40 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
	aria-label={label}
	{...restProps}
>
	{@render children()}
</button>
