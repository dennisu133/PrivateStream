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
		plugins: [tailwindcss(), sveltekit()],
		define: { "import.meta.env.BORING": JSON.stringify(env.BORING ?? "false") },
		resolve: {
			alias: [
				{
					find: "virtual:catchip-widget",
					replacement:
						env.BORING === "true"
							? emptyComponent
							: fileURLToPath(new URL("./src/lib/components/Catchip.svelte", import.meta.url))
				},
				{
					find: "virtual:neko-widget",
					replacement:
						env.BORING === "true"
							? emptyComponent
							: fileURLToPath(new URL("./src/lib/components/Neko.svelte", import.meta.url))
				}
			]
		},
		server: { host: "127.0.0.1" }
	};
});
