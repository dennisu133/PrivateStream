<script lang="ts">
	import type { ActionData } from "./$types";

	let { form }: { form: ActionData } = $props();
</script>

<div class=" w-full max-w-sm rounded-lg border border-zinc-700 bg-black/70 p-6">
	<form method="POST" class="flex flex-col gap-3">
		<input
			type="password"
			name="password"
			placeholder="Password"
			required
			class="rounded-lg border border-white/12 bg-white/10 px-3.5 py-3.5 focus:border-blue-500/65"
		/>
		{#if form?.error}
			<p class="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-red-400">
				{form.error}
			</p>
		{/if}
		<button
			type="submit"
			class="cursor-pointer rounded-lg bg-white/10 bg-linear-to-r from-blue-500 to-cyan-500 px-3.5 py-3.5 hover:from-blue-700 hover:to-cyan-600"
			>Enter
		</button>
	</form>
</div>
