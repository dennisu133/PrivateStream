<!-- Film-gate brackets: four hard-edged Ls marking a frame's corners the way a
     camera viewfinder marks the gate. Used by both the player and the login
     ticket so the two routes read as the same piece of apparatus.

     Alpha rides the inherited `--edge`, so a frame can brighten its own corners
     without a gradient anywhere - see the note on @property in app.css. Sizing
     is inline rather than utility classes so callers can pass any value without
     Tailwind needing to have seen that class name at build time. -->

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
		class="pointer-events-none absolute {edges}"
		style="{y}: -{inset}px; {x}: -{inset}px; width: {size}px; height: {size}px;
		       border-color: oklch(0.76 0.1 75 / var(--edge));"
		aria-hidden="true"
	></span>
{/each}
