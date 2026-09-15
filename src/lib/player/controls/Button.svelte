<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	// title, disabled, onclick and the rest of the button surface already exist on
	// HTMLButtonAttributes and reach the element through restProps. Only two props
	// are lifted out: the accessible name, so an icon-only button cannot ship
	// unnamed, and ref, since bind:this cannot travel through restProps.
	let {
		children,
		label,
		ref = $bindable(null),
		...restProps
	}: HTMLButtonAttributes & {
		children: Snippet;
		label: string;
		ref?: HTMLButtonElement | null;
	} = $props();
</script>

<button
	bind:this={ref}
	type="button"
	class="grid size-8 cursor-pointer place-items-center rounded-sm text-muted transition-all duration-200 ease-out-expo hover:bg-accent/10 hover:text-accent focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
	aria-label={label}
	{...restProps}
>
	{@render children()}
</button>
