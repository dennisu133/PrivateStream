<script lang="ts">
	import type { ActionData } from "./$types";
	import FrameBrackets from "$lib/components/FrameBrackets.svelte";

	let { form }: { form: ActionData } = $props();

	const title = import.meta.env.VITE_META_TITLE_PUBLIC || "PrivateStream";
</script>

<div class="flex flex-col items-center">
	<div class="relative w-full max-w-xs" style:--edge="0.42" class:ticket-shake={!!form?.error}>
		<div
			class="h-px w-full"
			style="background: linear-gradient(to right, transparent 4%, oklch(0.76 0.1 75 / var(--edge)) 22%, oklch(0.76 0.1 75 / var(--edge)) 78%, transparent 96%);"
			aria-hidden="true"
		></div>

		<div class="px-8 py-9">
			<h1
				class="mb-8 text-center font-display text-2xl leading-none tracking-[0.12em] text-theater-paper"
			>
				{title}
			</h1>

			<form method="POST" class="flex flex-col gap-4">
				<input
					type="password"
					name="password"
					placeholder="Enter passphrase"
					required
					class="w-full rounded-sm border bg-theater-dark/70 px-4 py-3 text-center font-mono text-sm tracking-wider text-theater-paper transition-colors duration-200 placeholder:tracking-normal placeholder:text-theater-muted/50 focus:border-theater-gold/45 focus:outline-none {form?.error
						? 'border-red-500/30'
						: 'border-theater-border'}"
				/>

				<button
					type="submit"
					class="group relative cursor-pointer overflow-hidden rounded-sm border border-theater-gold/20 bg-theater-black px-4 py-3 font-mono text-xs font-medium tracking-[0.15em] text-theater-gold uppercase transition-all duration-300 before:absolute before:inset-0 before:bg-theater-gold/8 before:transition-colors before:duration-300 before:content-[''] hover:border-theater-gold/40 hover:before:bg-theater-gold/12"
				>
					<span class="relative z-10">Enter</span>
				</button>
			</form>
		</div>

		<div
			class="h-px w-full"
			style="background: linear-gradient(to right, transparent 4%, oklch(0.76 0.1 75 / calc(var(--edge) * 0.66)) 22%, oklch(0.76 0.1 75 / calc(var(--edge) * 0.66)) 78%, transparent 96%);"
			aria-hidden="true"
		></div>

		<FrameBrackets size={16} />

		<!-- Keep errors out of flow so they do not shift the centered form. The
		     persistent live region announces new errors. -->
		<div
			class="absolute inset-x-0 top-full mt-5 flex justify-center"
			role="alert"
			aria-live="assertive"
		>
			{#if form?.error}
				<p
					class="error-slip text-center font-mono text-xs leading-relaxed font-light tracking-widest text-red-400/90 uppercase"
				>
					{form.error}
				</p>
			{/if}
		</div>
	</div>

	<!-- Leave room for the absolute error message. -->
	<a
		href="/demo"
		class="mt-20 font-mono text-[11px] tracking-[0.2em] text-theater-muted/60 uppercase transition-colors duration-300 hover:text-theater-gold/70"
	>
		View demo
	</a>
</div>

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
