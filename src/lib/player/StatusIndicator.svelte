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
	class="inline-flex items-center gap-2.5 font-mono text-xs leading-none font-light tracking-widest uppercase"
>
	<span
		class="relative inline-flex h-2 w-2 shrink-0 items-center justify-center rounded-full
			{state === 'ok'
			? 'status-live bg-emerald-400 text-emerald-400'
			: state === 'warn'
				? 'bg-red-400 text-red-400'
				: 'border border-white/20 bg-transparent'}"
		aria-hidden="true"
	>
		{#if state === "pending"}
			<span
				class="h-1.5 w-1.5 animate-spin rounded-full border border-white/15 border-t-theater-gold"
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
