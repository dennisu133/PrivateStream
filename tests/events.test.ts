import { expect, test } from "bun:test";
import { MAX_CHAT_LENGTH, parseStreamEvent } from "../src/lib/events";

test("normalizes chat and preserves reaction events", () => {
	expect(parseStreamEvent({ type: "chat", text: "  こんにちは  " })).toEqual({
		type: "chat",
		text: "こんにちは"
	});
	expect(parseStreamEvent({ type: "reaction", id: "cat.png" })).toEqual({
		type: "reaction",
		id: "cat.png"
	});
	expect(parseStreamEvent({ type: "chat", text: "x".repeat(MAX_CHAT_LENGTH) })).not.toBeNull();
});

test("rejects empty, oversized and malformed messages", () => {
	for (const value of [
		null,
		{},
		{ type: "other" },
		{ type: "chat", text: 123 },
		{ type: "chat", text: " \n " },
		{ type: "chat", text: "x".repeat(MAX_CHAT_LENGTH + 1) }
	]) {
		expect(parseStreamEvent(value)).toBeNull();
	}
});
