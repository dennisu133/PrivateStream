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

<span class="inline-flex items-center gap-2 font-semibold tracking-wide uppercase">
	<span
		class="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full
			{state === 'ok'
			? 'bg-green-400 shadow-[0_0_8px_var(--color-green-400)]'
			: state === 'warn'
				? 'bg-red-500 shadow-[0_0_8px_var(--color-red-500)]'
				: 'border border-white/30 bg-transparent'}"
		aria-hidden="true"
	>
		{#if state === "pending"}
			<span
				class="h-2 w-2 animate-spin rounded-full border border-white/20 border-t-white"
				aria-hidden="true"
			></span>
		{/if}
	</span>
	<span>{label}</span>
</span>
