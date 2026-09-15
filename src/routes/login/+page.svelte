<script lang="ts">
	import { enhance } from "$app/forms";
	import type { ActionData } from "./$types";
	import FrameBrackets from "$lib/components/FrameBrackets.svelte";
	import { publicTitle } from "$lib/meta";

	let { form }: { form: ActionData } = $props();
</script>

<div class="film-frame fixed inset-0 flex items-center justify-center">
	<!-- A gradual exposure across the frame reveals the scratches. -->
	<div
		aria-hidden="true"
		class="film-grain pointer-events-none absolute -inset-1 bg-[linear-gradient(115deg,#000_0%,#090908_30%,#181713_65%,#2c2923_100%)]"
	>
		<svg
			class="absolute inset-0 h-full w-full"
			viewBox="0 0 1440 1000"
			preserveAspectRatio="none"
			fill="none"
		>
			<!-- Broken, slightly wandering lines avoid the regularity of a digital grid. -->
			<g
				class="film-scratches"
				stroke="#000"
				stroke-opacity="0.48"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			>
				<path
					opacity="0.55"
					d="M72 0 74 324 M73 349 72 1000 M187 0 185 589 M186 611 187 1000 M384 0 386 417 M385 439 384 1000 M463 73 462 661 M462 688 464 974 M827 0 829 271 M828 293 827 1000 M904 0 903 773 M904 802 905 1000 M1180 0 1182 508 M1181 531 1180 1000 M1372 0 1370 368 M1371 391 1372 1000"
				/>
				<path d="M133 0 134 178 M134 193 132 418 133 690 M133 722 134 1000" />
				<path d="M258 0 257 305 M257 324 259 616 M258 639 258 1000" />
				<path d="M312 48 313 265 M313 281 311 579 M312 605 313 937" />
				<path d="M1009 0 1011 226 M1010 241 1009 523 1011 717 M1011 750 1010 1000" />
				<path d="M1118 0 1117 369 M1117 396 1119 667 M1118 690 1118 1000" />
				<path d="M1123 84 1122 338 M1123 411 1124 582 M1123 619 1123 922" />
				<path d="M1302 0 1300 181 M1301 201 1302 564 M1302 584 1300 1000" />
			</g>
			<g
				class="film-scratches film-scratches-light"
				stroke="#c5b99e"
				stroke-opacity="0.12"
				stroke-width="0.65"
			>
				<path
					opacity="0.6"
					d="M190 0 189 451 M189 480 190 1000 M389 107 388 782 M833 0 832 326 M832 358 833 904 M1286 0 1285 573 M1285 601 1286 1000"
				/>
				<path d="M261 0 260 247 M260 270 261 481 M261 754 260 1000" />
				<path d="M946 0 947 156 M947 177 946 358 M946 391 948 476" />
				<path d="M1207 143 1206 327 M1206 361 1207 635 M1207 659 1206 861" />
			</g>
			<g stroke="#000" stroke-opacity="0.55" stroke-width="1.5">
				<path
					d="m1083 172 -1 9 m157 92 -2 14 m-215 306 1 8 m274 182 -2 17 m-961 -472 -1 11 m809 -259 -1 6"
				/>
			</g>
			<!-- Independent stepped cycles make dust appear at scattered positions. -->
			<g class="film-spots" fill="#000" fill-opacity="0.75">
				<path
					d="m218 182 4 -3 3 2 -1 5 -5 1z M1064 328l6 -2 2 4 -3 5 -4 -1z M1243 741l3 -5 4 2 -1 6z"
				/>
				<ellipse cx="382" cy="812" rx="2" ry="4" />
			</g>
			<g class="film-spots film-spots-pale" fill="#c5b99e" fill-opacity="0.35">
				<path d="m164 668 3 -2 2 4 -4 2z M913 137l4 -1 1 3 -3 2z M1192 887l2 -4 3 1 -1 5z" />
				<ellipse cx="1327" cy="464" rx="1.5" ry="3" />
			</g>
		</svg>
		<div
			class="absolute inset-0 bg-[linear-gradient(0deg,#0009,transparent_24%,transparent_80%,#0005)]"
		></div>
	</div>

	<div class="relative flex flex-col items-center">
		<!-- Every action response is a new object, so this rebuilds the card and replays
	     the shake and slip animations on a repeat failure. -->
		{#key form}
			<div
				class="relative w-full max-w-xs"
				style:--frame-opacity="0.42"
				class:ticket-shake={!!form?.error}
			>
				<div class="h-px frame-edge" aria-hidden="true"></div>

				<div class="px-8 py-9">
					<h1
						class="mb-8 text-center font-display text-2xl leading-none tracking-widest text-foreground"
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
							class="w-full rounded-sm border bg-surface/70 px-4 py-3 text-center text-sm tracking-wider text-foreground transition-colors duration-200 placeholder:tracking-normal placeholder:text-muted/50 focus:border-accent/45 focus:outline-hidden {form?.error
								? 'border-red-500/30'
								: 'border-border'}"
						/>

						<button
							type="submit"
							class="cursor-pointer rounded-sm border border-accent/20 bg-accent/8 px-4 py-3 text-xs font-medium tracking-widest text-accent uppercase transition-colors duration-300 hover:border-accent/40 hover:bg-accent/12 focus-visible:border-accent/60 focus-visible:bg-accent/12 focus-visible:outline-hidden"
						>
							Enter
						</button>
					</form>
				</div>

				<div class="h-px frame-edge" style:--edge-scale="0.66" aria-hidden="true"></div>

				<FrameBrackets size={16} />

				<!-- Keep errors out of flow so they do not shift the centered form. -->
				<div class="absolute inset-x-0 top-full mt-5 flex justify-center" role="alert">
					{#if form?.error}
						<p
							class="error-slip text-center text-xs leading-relaxed font-light tracking-widest text-red-400/90 uppercase"
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
			class="mt-20 rounded-sm text-xs tracking-widest text-muted/60 uppercase transition-colors duration-300 hover:text-accent/70 focus-visible:text-accent focus-visible:outline-1 focus-visible:outline-offset-8 focus-visible:outline-accent/60"
		>
			View demo
		</a>
	</div>
</div>

<style>
	.film-spots {
		opacity: 0.45;
	}
	@media (prefers-reduced-motion: no-preference) {
		.film-frame {
			animation: film-jitter 1.7s steps(1, end) infinite;
		}
		.film-spots {
			animation: film-dust 2.3s steps(1, end) infinite;
		}
		.film-spots-pale {
			animation: film-dust 3.1s steps(1, end) -1.4s infinite reverse;
		}

		.film-scratches {
			animation: film-wear 2s steps(1, end) infinite;
		}

		.film-scratches-light {
			animation: film-wear 3.5s steps(1, end) -1s infinite reverse;
		}

		.ticket-shake {
			animation: ticket-shake 0.4s ease-in-out;
		}

		.error-slip {
			animation: error-slip-in 0.3s ease-out;
		}
	}

	@keyframes film-jitter {
		0%,
		22%,
		64%,
		81%,
		100% {
			transform: translate(0, 0);
		}
		17% {
			transform: translate(0.5px, -0.5px);
		}
		46% {
			transform: translate(-0.5px, 1px);
		}
		71% {
			transform: translate(0.5px, 0);
		}
		76% {
			transform: translate(0, -1px);
		}
	}

	@keyframes film-dust {
		0%,
		12%,
		39%,
		67%,
		93%,
		100% {
			opacity: 0;
		}
		8% {
			opacity: 1;
			transform: translate(0, 0);
		}
		34% {
			opacity: 0.8;
			transform: translate(-91px, 127px);
		}
		62% {
			opacity: 1;
			transform: translate(73px, -83px);
		}
		89% {
			opacity: 0.7;
			transform: translate(-47px, -151px);
		}
	}

	/* Long holds and brief registration slips, rather than a continuous pan. */
	@keyframes film-wear {
		0%,
		100% {
			transform: translate(0, 0);
			opacity: 1;
		}
		32% {
			transform: translate(2px, -3px);
			opacity: 0.75;
		}
		34% {
			transform: translate(-1px, 2px);
			opacity: 0.9;
		}
		58% {
			transform: translate(0, -2px);
			opacity: 0.65;
		}
		76% {
			transform: translate(-2px, 3px);
			opacity: 0.85;
		}
		78% {
			transform: translate(1px, 0);
			opacity: 1;
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
