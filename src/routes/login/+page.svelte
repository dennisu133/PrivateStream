<script lang="ts">
	import type { ActionData } from "./$types";

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex flex-col items-center gap-6">
	<!-- Admission ticket card -->
	<div class="relative w-full max-w-xs" class:ticket-shake={!!form?.error}>
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
						class="w-full rounded-sm border bg-black/40 px-4 py-3 font-mono text-sm text-white/90 transition-all duration-200 placeholder:text-white/20 focus:border-theater-gold/40 focus:shadow-[0_0_0_1px_oklch(0.76_0.1_75_/_0.15)] focus:outline-none {form?.error
							? 'border-red-500/30'
							: 'border-theater-border'}"
					/>
				</div>

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

		<!-- Rejection slip: absolutely positioned below the ticket so the card
		     itself never grows and the submit button never shifts. -->
		{#if form?.error}
			<p
				role="alert"
				class="error-slip absolute inset-x-0 top-full mt-4 rounded-sm border border-red-500/20 bg-red-500/6 px-3 py-2.5 text-center font-mono text-xs text-red-400/80 backdrop-blur-sm"
			>
				{form.error}
			</p>
		{/if}
	</div>
</div>

<!-- Discreet public showcase entrance for visitors without a passphrase -->
<a
	href="/demo"
	class="fixed bottom-6 left-1/2 z-60 -translate-x-1/2 font-mono text-[11px] tracking-[0.2em] text-white/25 uppercase transition-colors duration-300 hover:text-theater-gold/70"
>
	View demo
</a>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ticket-shake {
			animation: ticket-shake 0.4s ease-in-out;
		}

		.error-slip {
			animation: error-slip-in 0.3s ease-out;
		}
	}

	@keyframes ticket-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px);
		}
		40% {
			transform: translateX(6px);
		}
		60% {
			transform: translateX(-4px);
		}
		80% {
			transform: translateX(4px);
		}
	}

	@keyframes error-slip-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
