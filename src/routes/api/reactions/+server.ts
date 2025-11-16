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

// In-memory SSE subscribers
const subscribers = new Set<{
	write: (data: string) => void;
	close: () => void;
}>();

function subscribe(sink: { write: (data: string) => void; close: () => void }) {
	subscribers.add(sink);
	return () => subscribers.delete(sink);
}

function broadcast(type: string, payload: unknown = {}) {
	const msg = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
	for (const sink of [...subscribers]) {
		try {
			sink.write(msg);
		} catch {
			try {
				sink.close();
			} catch {}
			subscribers.delete(sink);
		}
	}
}

export const GET: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized: You must be verified.");
	}

	const accept = request.headers.get("accept") || "";
	// Serve SSE when requested by EventSource; otherwise list reactions
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

		const sink = {
			write: (data: string) => {
				if (closed) return;
				writer.write(encoder.encode(data)).catch(() => {
					cleanup();
				});
			},
			close: () => cleanup(),
		};

		unsubscribe = subscribe(sink);

		// Open stream and ping
		sink.write(": connected\n\n");
		pingId = setInterval(() => sink.write("event: ping\ndata: {}\n\n"), 25000);

		// Abort when client disconnects
		request.signal.addEventListener(
			"abort",
			() => {
				cleanup();
			},
			{ once: true },
		);

		return new Response(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
			},
		});
	}

	// Otherwise return list of available reactions
	let entries: Dirent[];
	try {
		entries = await readdir(REACTIONS_DIR, { withFileTypes: true });
	} catch {
		throw error(500, "Failed to read reactions directory");
	}

	const reactions = entries
		.filter(
			(d) => d.isFile() && ALLOWED.has(path.extname(d.name).toLowerCase()),
		)
		.map((d) => {
			const file = d.name;
			const url = `/reactions/${encodeURIComponent(file)}`;
			const name = file.replace(/\.[^.]+$/, "");
			return { name, url, file };
		});
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
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, "Bad Request: Expected JSON body");
	}
	if (
		!data ||
		typeof data !== "object" ||
		data === null ||
		!("type" in data) ||
		typeof (data as { type: unknown }).type !== "string"
	) {
		throw error(
			400,
			"Bad Request: body must be { type: string, payload?: unknown }",
		);
	}
	const { type, payload } = data as { type: string; payload?: unknown };
	broadcast(type, payload ?? {});
	return json({ ok: true });
};
