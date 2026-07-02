import adapter from "svelte-adapter-bun";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			precompress: true
		}),

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
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
