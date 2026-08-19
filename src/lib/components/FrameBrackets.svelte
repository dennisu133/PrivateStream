<!-- Inline sizing accepts arbitrary caller values; frame-bracket inherits the frame opacity. -->

<script lang="ts">
	let { size = 20, inset = 8 }: { size?: number; inset?: number } = $props();

	const corners = [
		["top", "left", "border-t border-l"],
		["top", "right", "border-t border-r"],
		["bottom", "right", "border-b border-r"],
		["bottom", "left", "border-b border-l"]
	] as const;
</script>

{#each corners as [y, x, edges] (edges)}
	<span
		class="pointer-events-none absolute frame-bracket {edges}"
		style="{y}: -{inset}px; {x}: -{inset}px; width: {size}px; height: {size}px;"
		aria-hidden="true"
	></span>
{/each}
