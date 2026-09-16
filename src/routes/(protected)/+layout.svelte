<script lang="ts">
	import { LogOut } from "@lucide/svelte";

	let { children } = $props();
</script>

<form method="POST" action="/logout" class="absolute top-5 right-5 z-20 sm:top-6 sm:right-6">
	<button
		type="submit"
		class="flex cursor-pointer items-center gap-2.5 rounded-sm border border-border bg-background/40 p-2 font-mono text-xs font-light tracking-widest text-muted uppercase transition-colors duration-200 hover:border-accent/40 hover:bg-accent/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none"
	>
		<LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
		Log out
	</button>
</form>

{@render children()}
