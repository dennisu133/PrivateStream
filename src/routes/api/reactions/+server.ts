import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const ALLOWED = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".avif",
	".svg",
]);

const encoder = new TextEncoder();
const REACTIONS_DIR = path.join(process.cwd(), "static", "reactions");

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

const subscribers = new Set<Sink>();
let reactionsCache: ReactionRecord[] | null = null;

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
		reaction: {
			id: reaction.id,
			file: reaction.file,
			name: reaction.name,
			url: reaction.url,
		},
		at: Date.now(),
	};
	const msg = `event: reaction\ndata: ${JSON.stringify(payload)}\n\n`;
	for (const sink of [...subscribers]) {
		writeToSink(sink, msg);
	}
}

async function readReactions(force = false) {
	if (!force && reactionsCache) return reactionsCache;
	let entries: Dirent[];
	try {
		entries = await readdir(REACTIONS_DIR, { withFileTypes: true });
	} catch {
		throw error(500, "Failed to read reactions directory");
	}
	const reactions = entries
		.filter(
			(entry) =>
				entry.isFile() && ALLOWED.has(path.extname(entry.name).toLowerCase()),
		)
		.map((entry) => {
			const file = entry.name;
			const id = file;
			const name = file.replace(/\.[^.]+$/, "");
			const url = `/reactions/${encodeURIComponent(file)}`;
			return { id, file, name, url };
		});
	reactionsCache = reactions;
	return reactions;
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

	const reactions = await readReactions();
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

	let reactions = await readReactions();
	let reaction = reactions.find((item) => item.id === id) ?? null;
	if (!reaction) {
		reactions = await readReactions(true);
		reaction = reactions.find((item) => item.id === id) ?? null;
	}
	if (!reaction) {
		throw error(404, "Unknown reaction");
	}

	const resolved = reaction;
	reactionsCache = reactionsCache?.map((item) =>
		item.id === resolved.id ? resolved : item,
	) ?? [resolved];

	broadcastReaction(resolved);
	return json({ ok: true });
};
