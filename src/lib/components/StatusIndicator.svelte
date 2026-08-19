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
	<!-- Align the LED with the first line's cap height. The constants come from
	     JetBrains Mono's ascent, descent, and cap metrics. -->
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
