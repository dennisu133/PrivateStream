<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.ico";
	import fontBebasNeue from "$lib/assets/fonts/bebas-neue-400.woff2";
	import fontGeistMono from "$lib/assets/fonts/geist-mono-300-500.woff2";

	import { publicTitle } from "$lib/meta";
	import { page } from "$app/state";

	let { children } = $props();

	// prettier-ignore
	const description = import.meta.env.VITE_META_DESCRIPTION || "Private livestream viewer for friend groups.";

	const color = import.meta.env.VITE_META_COLOR || "#E4B583";
	const image = $derived(
		new URL(import.meta.env.VITE_OG_IMAGE || "/og-image.gif", page.url.origin).href
	);
</script>

<svelte:head>
	<link rel="preload" href={fontBebasNeue} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={fontGeistMono} as="font" type="font/woff2" crossorigin="anonymous" />

	<link rel="icon" href={favicon} />
	<title>{publicTitle}</title>
	<meta name="description" content={description} />
	<meta name="theme-color" content={color} />
	<meta property="og:title" content={publicTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin + page.url.pathname} />
	<meta property="og:image" content={image} />
</svelte:head>

<div class="film-grain relative isolate h-dvh w-screen bg-background">
	{#if page.route.id !== "/login"}
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,#000_0%,#030303_30%,#080807_65%,#0f0e0c_100%)]"
		>
			<svg
				class="absolute inset-0 size-full opacity-25"
				viewBox="0 0 1440 1000"
				preserveAspectRatio="none"
				fill="none"
			>
				<!-- Broken, slightly wandering lines avoid the regularity of a digital grid. -->
				<g stroke="#000" stroke-opacity="0.48" stroke-width="1" vector-effect="non-scaling-stroke">
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
				<g stroke="#c5b99e" stroke-opacity="0.12" stroke-width="0.65">
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
				<!-- Fixed dust flecks keep the player background still. -->
				<g opacity="0.45" fill="#000" fill-opacity="0.75">
					<path
						d="m218 182 4 -3 3 2 -1 5 -5 1z M1064 328l6 -2 2 4 -3 5 -4 -1z M1243 741l3 -5 4 2 -1 6z"
					/>
					<ellipse cx="382" cy="812" rx="2" ry="4" />
				</g>
				<g opacity="0.45" fill="#c5b99e" fill-opacity="0.35">
					<path d="m164 668 3 -2 2 4 -4 2z M913 137l4 -1 1 3 -3 2z M1192 887l2 -4 3 1 -1 5z" />
					<ellipse cx="1327" cy="464" rx="1.5" ry="3" />
				</g>
			</svg>
		</div>
	{/if}
	<main class="relative z-10 flex h-full items-center justify-center">
		{@render children()}
	</main>
</div>
