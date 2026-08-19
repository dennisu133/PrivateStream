<script lang="ts">
	import { enhance } from "$app/forms";
	import type { ActionData } from "./$types";
	import FrameBrackets from "$lib/components/FrameBrackets.svelte";
	import { publicTitle } from "$lib/meta";

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex flex-col items-center">
	<!-- Every action response is a new object, so this rebuilds the card and replays
	     the shake and slip animations on a repeat failure. -->
	{#key form}
		<div class="relative w-full max-w-xs" style:--edge="0.42" class:ticket-shake={!!form?.error}>
			<div class="h-px w-full frame-edge" aria-hidden="true"></div>

			<div class="px-8 py-9">
				<h1
					class="mb-8 text-center font-display text-2xl leading-none tracking-[0.12em] text-theater-paper"
				>
					{publicTitle}
				</h1>

				<form method="POST" use:enhance class="flex flex-col gap-4">
					<!-- svelte-ignore a11y_autofocus -->
					<!-- autofocus is justified since it's just a login page -->
					<input
						type="password"
						name="password"
						aria-label="Passphrase"
						placeholder="Enter passphrase"
						autocomplete="current-password"
						required
						autofocus
						class="w-full rounded-sm border bg-theater-dark/70 px-4 py-3 text-center font-mono text-sm tracking-wider text-theater-paper transition-colors duration-200 placeholder:tracking-normal placeholder:text-theater-muted/50 focus:border-theater-gold/45 focus:outline-none {form?.error
							? 'border-red-500/30'
							: 'border-theater-border'}"
					/>

					<button
						type="submit"
						class="cursor-pointer rounded-sm border border-theater-gold/20 bg-theater-gold/8 px-4 py-3 font-mono text-xs font-medium tracking-[0.15em] text-theater-gold uppercase transition-colors duration-300 hover:border-theater-gold/40 hover:bg-theater-gold/12"
					>
						Enter
					</button>
				</form>
			</div>

			<div class="h-px w-full frame-edge" style:--edge-scale="0.66" aria-hidden="true"></div>

			<FrameBrackets size={16} />

			<!-- Keep errors out of flow so they do not shift the centered form. -->
			<div class="absolute inset-x-0 top-full mt-5 flex justify-center" role="alert">
				{#if form?.error}
					<p
						class="error-slip text-center font-mono text-xs leading-relaxed font-light tracking-widest text-red-400/90 uppercase"
					>
						{form.error}
					</p>
				{/if}
			</div>
		</div>
	{/key}

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
