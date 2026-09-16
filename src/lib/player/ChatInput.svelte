<script lang="ts">
	import { Check, Send } from "@lucide/svelte";
	import { onDestroy } from "svelte";
	import { MAX_CHAT_LENGTH } from "$lib/events";
	import { sendEvent } from "./events";

	let {
		overlay = false,
		text = $bindable(""),
		ref = $bindable(null)
	}: { overlay?: boolean; text?: string; ref?: HTMLInputElement | null } = $props();

	let sending = $state(false);
	let feedback = $state("");
	let sent = $state(false);
	let sentTimer: ReturnType<typeof setTimeout>;

	onDestroy(() => clearTimeout(sentTimer));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const draft = text;
		const message = draft.trim();
		if (!message || sending) return;
		clearTimeout(sentTimer);
		sent = false;
		sending = true;
		feedback = "";
		try {
			await sendEvent({ type: "chat", text: message });
			if (text === draft) text = "";
			sent = true;
			sentTimer = setTimeout(() => (sent = false), 700);
		} catch (error) {
			feedback = error instanceof Error ? error.message : "Could not send. Please try again.";
		} finally {
			sending = false;
		}
	}
</script>

<form class={["relative flex w-full gap-2", !overlay && "@2xl:w-80"]} onsubmit={submit}>
	<input
		bind:this={ref}
		bind:value={text}
		oninput={() => (feedback = "")}
		type="text"
		aria-label="Chat message"
		title="Type a chat message (c)"
		aria-keyshortcuts="c"
		placeholder="Send a message…"
		maxlength={MAX_CHAT_LENGTH}
		autocomplete="off"
		class={[
			"min-w-0 flex-1 rounded-sm border text-xs text-foreground placeholder:text-muted/60 focus:border-accent/40 focus:outline-none",
			overlay
				? "h-8 border-transparent bg-transparent px-1"
				: "border-border bg-background/40 px-3 py-2"
		]}
	/>
	<button
		type="submit"
		aria-label={sending ? "Sending message" : sent ? "Message sent" : "Send message"}
		title="Send message"
		disabled={sending || !text.trim()}
		class={[
			"grid shrink-0 cursor-pointer place-items-center rounded-sm border transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default",
			overlay
				? "size-8 border-transparent bg-transparent hover:bg-accent/10"
				: "size-9 border-border bg-background/40",
			sent ? "text-accent" : "text-muted disabled:opacity-40"
		]}
	>
		<span class={["send-icon", sent && "hidden-icon"]}>
			<Send size={15} aria-hidden="true" />
		</span>
		<span class={["send-icon", !sent && "hidden-icon"]}>
			<Check size={15} aria-hidden="true" />
		</span>
	</button>
	<p
		role="status"
		class={[
			"absolute right-0 text-xs text-red-400",
			overlay ? "bottom-full mb-3 rounded-sm bg-background/85 px-2" : "top-full mt-1"
		]}
	>
		{feedback}
		<span class="sr-only">{sent ? "Message sent" : ""}</span>
	</p>
</form>

<style>
	.send-icon {
		grid-area: 1 / 1;
		transition:
			opacity 150ms ease,
			transform 150ms ease;
	}

	.hidden-icon {
		opacity: 0;
		transform: scale(0.75);
	}

	@media (prefers-reduced-motion: reduce) {
		.send-icon {
			transition: none;
		}
	}
</style>
