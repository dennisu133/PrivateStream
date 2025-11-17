import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const encoder = new TextEncoder();

const reactionModules = import.meta.glob("../../../../static/reactions/*", {
	eager: true,
}) as Record<string, { default: string }>;

type ReactionRecord = {
	id: string;
	file: string;
	name: string;
	url: string;
};

type Sink = {
	write: (data: string) => void;
	close: () => void;
};

const reactions: ReactionRecord[] = Object.keys(reactionModules)
	.map((path) => {
		const file = path.split("/").pop() ?? "";
		const name = file.replace(/\.[^.]+$/, "");
		const url = `/reactions/${encodeURIComponent(file)}`;
		return { id: file, file, name, url } satisfies ReactionRecord;
	})
	.sort((a, b) => a.name.localeCompare(b.name, "en"));

const reactionsById = new Map(reactions.map((item) => [item.id, item]));

const subscribers = new Set<Sink>();

function subscribe(sink: Sink) {
	subscribers.add(sink);
	return () => subscribers.delete(sink);
}

function writeToSink(sink: Sink, data: string) {
	try {
		sink.write(data);
	} catch {
		try {
			sink.close();
		} catch {}
		subscribers.delete(sink);
	}
}

function broadcastReaction(reaction: ReactionRecord) {
	const payload = {
		reaction,
		at: Date.now(),
	};
	const msg = `event: reaction\ndata: ${JSON.stringify(payload)}\n\n`;
	for (const sink of [...subscribers]) {
		writeToSink(sink, msg);
	}
}

function getReactionById(id: string) {
	return reactionsById.get(id) ?? null;
}

export const GET: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized: You must be verified.");
	}

	const accept = request.headers.get("accept") || "";
	if (accept.includes("text/event-stream")) {
		const { readable, writable } = new TransformStream<Uint8Array>();
		const writer = writable.getWriter();

		let closed = false;
		let unsubscribe: () => void = () => {};
		let pingId: ReturnType<typeof setInterval> | undefined;

		const cleanup = () => {
			if (closed) return;
			closed = true;
			if (pingId !== undefined) {
				clearInterval(pingId);
				pingId = undefined;
			}
			try {
				unsubscribe();
			} catch {}
			try {
				writer.close();
			} catch {}
		};

		const sink: Sink = {
			write: (data: string) => {
				if (closed) return;
				writer.write(encoder.encode(data)).catch(() => {
					cleanup();
				});
			},
			close: () => cleanup(),
		};

		unsubscribe = subscribe(sink);
		sink.write(": connected\n\n");
		pingId = setInterval(() => sink.write("event: ping\ndata: {}\n\n"), 25000);

		request.signal.addEventListener("abort", () => cleanup(), { once: true });

		return new Response(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
			},
		});
	}

	return json(
		{ reactions },
		{
			headers: {
				"Cache-Control": "private, max-age=30",
			},
		},
	);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized: You must be verified to send reactions.");
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, "Bad Request: Expected JSON body");
	}

	if (!body || typeof body !== "object") {
		throw error(
			400,
			"Bad Request: body must be { type: string, payload?: unknown }",
		);
	}

	const { type, payload } = body as { type?: unknown; payload?: unknown };
	if (type !== "reaction") {
		throw error(400, "Bad Request: Unsupported reaction type");
	}
	if (!payload || typeof payload !== "object") {
		throw error(400, "Bad Request: payload must be an object");
	}

	const id = (payload as { id?: unknown }).id;
	if (typeof id !== "string" || id.length === 0) {
		throw error(400, "Bad Request: payload.id must be a non-empty string");
	}

	const reaction = getReactionById(id);
	if (!reaction) {
		throw error(404, "Unknown reaction");
	}

	broadcastReaction(reaction);
	return json({ ok: true });
};
