<!-- Four corner brackets, absolutely positioned: the caller must be a positioning
     context. frame-bracket takes the frame opacity from an inherited --edge.
     The border-* classes have to stay written out literally, since Tailwind scans
     source text and would not see them if they were derived from the sides. -->

<script lang="ts">
	let { size = 20 }: { size?: number } = $props();

	const corners = [
		["top", "left", "border-t border-l"],
		["top", "right", "border-t border-r"],
		["bottom", "right", "border-b border-r"],
		["bottom", "left", "border-b border-l"]
	] as const;
</script>

{#each corners as [y, x, edges]}
	<span
		class="pointer-events-none absolute frame-bracket {edges}"
		style="{y}: -8px; {x}: -8px; width: {size}px; height: {size}px;"
		aria-hidden="true"
	></span>
{/each}
