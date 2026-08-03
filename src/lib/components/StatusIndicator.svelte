<script lang="ts">
	import type { IndicatorState } from "$lib/types";

	let {
		state,
		label
	}: {
		state: IndicatorState;
		label: string;
	} = $props();
</script>

<span
	class="inline-flex items-start gap-2.5 font-mono text-xs leading-none font-light tracking-widest uppercase"
>
	<!-- The LED is sized and placed against the label's CAP BAND, not its line
	     box, so it spans exactly cap-top to baseline.

	     It aligns to the FIRST line rather than centring, so a label that wraps
	     keeps the dot on line one instead of floating it between the lines.
	     Offset from the line-box top to cap-top:
	         (lineHeight - ascent - descent) / 2 + ascent - cap
	     For JetBrains Mono ascent/descent/cap are 1 / 0.333 / 0.75em, and the
	     line height is read with `1lh` so this stays correct whatever leading the
	     label is given. Single-line output is identical to centring. -->
	<span
		class="relative mt-[calc((1lh-1.333em)/2+0.25em)] inline-flex size-[0.75em] shrink-0 items-center justify-center rounded-full
			{state === 'ok'
			? 'status-live bg-emerald-400 text-emerald-400'
			: state === 'warn'
				? 'bg-red-400 text-red-400'
				: 'border border-theater-gold/25 bg-transparent'}"
		aria-hidden="true"
	>
		{#if state === "pending"}
			<span
				class="h-1.5 w-1.5 animate-spin rounded-full border border-theater-gold/15 border-t-theater-gold"
				aria-hidden="true"
			></span>
		{/if}
	</span>
	<span
		class="text-theater-muted
		{state === 'ok' ? 'text-emerald-400/85' : state === 'warn' ? 'text-red-400/85' : ''}"
	>
		{label}
	</span>
</span>
