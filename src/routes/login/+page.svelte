<script lang="ts">
	import type { ActionData } from "./$types";

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex flex-col items-center gap-6">
	<!-- Admission ticket card -->
	<div class="relative w-full max-w-xs">
		<!-- Ticket stub decoration -->
		<div
			class="absolute -top-px right-6 left-6 h-px bg-linear-to-r from-transparent via-theater-gold/30 to-transparent"
			aria-hidden="true"
		></div>

		<div
			class="rounded-sm border border-theater-border bg-theater-surface/90 px-8 py-8 shadow-[0_8px_40px_-10px_oklch(0_0_0_/_0.6)] backdrop-blur-sm"
		>
			<form method="POST" class="flex flex-col gap-4">
				<div class="relative">
					<input
						type="password"
						name="password"
						placeholder="Enter passphrase"
						required
						class="w-full rounded-sm border border-theater-border bg-black/40 px-4 py-3 font-mono text-sm text-white/90 transition-all duration-200 placeholder:text-white/20 focus:border-theater-gold/40 focus:shadow-[0_0_0_1px_oklch(0.76_0.1_75_/_0.15)] focus:outline-none"
					/>
				</div>

				{#if form?.error}
					<p
						class="rounded-sm border border-red-500/20 bg-red-500/6 px-3 py-2.5 font-mono text-xs text-red-400/80"
					>
						{form.error}
					</p>
				{/if}

				<button
					type="submit"
					class="group relative cursor-pointer overflow-hidden rounded-sm border border-theater-gold/20 bg-theater-gold/8 px-4 py-3 font-mono text-xs font-medium tracking-[0.15em] text-theater-gold uppercase transition-all duration-300 hover:border-theater-gold/40 hover:bg-theater-gold/12 hover:shadow-[0_0_20px_-5px_oklch(0.76_0.1_75_/_0.2)]"
				>
					<span class="relative z-10">Enter</span>
				</button>
			</form>
		</div>

		<!-- Bottom ticket decoration -->
		<div
			class="absolute right-6 -bottom-px left-6 h-px bg-linear-to-r from-transparent via-theater-gold/20 to-transparent"
			aria-hidden="true"
		></div>
	</div>
</div>
