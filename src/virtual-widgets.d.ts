declare module "virtual:*-widget" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}
