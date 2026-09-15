import adapter from "svelte-adapter-bun";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const emptyComponent = fileURLToPath(
		new URL("./src/lib/components/Empty.svelte", import.meta.url)
	);

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter({
					precompress: true
				}),

				// The main stylesheet is ~34 KB raw (~7 KB gzipped); inlining it removes
				// the render-blocking request
				inlineStyleThreshold: 40960,

				// Content Security Policy: restrict browser resource loading and embedding
				// to limit what injected content can do. SvelteKit authorizes its own inline code.
				csp: {
					mode: "auto",
					directives: {
						"default-src": ["self"],
						"script-src": ["self"],
						"style-src": ["self", "unsafe-inline"],
						"img-src": ["self", "data:", "blob:"],
						"font-src": ["self"],
						"media-src": ["self", "blob:"],
						"connect-src": ["self"],
						"object-src": ["none"],
						"base-uri": ["self"],
						"form-action": ["self"],
						"frame-ancestors": ["none"]
					}
				}
			})
		],
		resolve: {
			alias: [
				{
					find: "virtual:catchip-widget",
					replacement:
						env.VITE_BORING === "true"
							? emptyComponent
							: fileURLToPath(new URL("./src/lib/components/Catchip.svelte", import.meta.url))
				},
				{
					find: "virtual:neko-widget",
					replacement:
						env.VITE_BORING === "true"
							? emptyComponent
							: fileURLToPath(new URL("./src/lib/components/Neko.svelte", import.meta.url))
				}
			]
		},
		server: { host: "127.0.0.1" }
	};
});
