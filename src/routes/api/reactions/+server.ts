import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Glob static assets to build manifest
const modules = import.meta.glob("../../../../static/reactions/*", { eager: true });
const reactions = Object.keys(modules).map((path) => {
	const file = path.split("/").pop()!;
	return {
		id: file,
		name: file.replace(/\.[^.]+$/, ""),
		url: `/reactions/${encodeURIComponent(file)}`,
	};
});

const streams = new Set<ReadableStreamDefaultController>();

// Global keep-alive
setInterval(() => {
	const ping = new TextEncoder().encode(":\n\n");
	for (const controller of streams) {
		try {
			controller.enqueue(ping);
		} catch {
			streams.delete(controller);
		}
	}
}, 30000);

function broadcast(data: object) {
	const msg = `event: reaction\ndata: ${JSON.stringify(data)}\n\n`;
	const bytes = new TextEncoder().encode(msg);
	for (const controller of streams) {
		try {
			controller.enqueue(bytes);
		} catch {
			streams.delete(controller);
		}
	}
}

export const GET: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, "Unauthorized");

	if (request.headers.get("accept")?.includes("text/event-stream")) {
		return new Response(
			new ReadableStream({
				start: (c) => streams.add(c),
				cancel: (c) => streams.delete(c),
			}),
			{
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			},
		);
	}

	return json({ reactions });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, "Unauthorized");
	const { payload } = await request.json().catch(() => ({}));
	const reaction = reactions.find((r) => r.id === payload?.id);
	if (!reaction) throw error(404, "Unknown reaction");

	broadcast({ reaction, at: Date.now() });
	return json({ ok: true });
};
