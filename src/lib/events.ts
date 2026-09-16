export const MAX_CHAT_LENGTH = 200;

export type StreamEvent = { type: "reaction"; id: string } | { type: "chat"; text: string };

/** Normalize untrusted input before broadcasting or displaying it. */
export function parseStreamEvent(value: unknown): StreamEvent | null {
	if (!value || typeof value !== "object") return null;
	if (!("type" in value)) return null;
	if (value.type === "reaction" && "id" in value && typeof value.id === "string") {
		return { type: "reaction", id: value.id };
	}
	if (value.type === "chat" && "text" in value && typeof value.text === "string") {
		const text = value.text.trim();
		if (text.length > 0 && text.length <= MAX_CHAT_LENGTH) return { type: "chat", text };
	}
	return null;
}
