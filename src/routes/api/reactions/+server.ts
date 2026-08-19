import { error, json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { createFixedWindowRateLimiter } from "$lib/server/rate-limit";
import type { RequestHandler } from "./$types";

// Allow bursts without letting one viewer dominate the overlay.
const reactionRateLimiter = createFixedWindowRateLimiter({
	windowMs: 10_000,
	perKeyLimit: 30,
	globalLimit: 120
});

const streams = new Set<ReadableStreamDefaultController>();
const KEEPALIVE_INTERVAL = 15_000;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

function startKeepAlive() {
	if (keepAliveTimer) return;
	keepAliveTimer = setInterval(() => {
		const ping = new TextEncoder().encode(": keepalive\n\n");
		for (const controller of streams) {
			try {
				controller.enqueue(ping);
			} catch {
				streams.delete(controller);
			}
		}
		if (streams.size === 0) stopKeepAlive();
	}, KEEPALIVE_INTERVAL);
}

function stopKeepAlive() {
	if (keepAliveTimer) {
		clearInterval(keepAliveTimer);
		keepAliveTimer = null;
	}
}

function broadcast(event: string, data: string) {
	const message = new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`);
	for (const controller of streams) {
		try {
			controller.enqueue(message);
		} catch {
			streams.delete(controller);
		}
	}
}

const reactionModules = import.meta.glob<{ default: string }>(
	"$lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true }
);

const validReactionIds = new Set(
	Object.keys(reactionModules).map((path) => path.split("/").pop()!)
);

export const GET: RequestHandler = ({ locals }) => {
	if (env.REACTIONS === "false") {
		throw error(404, "Reactions are disabled");
	}

	if (!locals.user) {
		throw error(401, "Unauthorized");
	}

	let streamController: ReadableStreamDefaultController;

	const stream = new ReadableStream({
		start(controller) {
			streamController = controller;
			streams.add(controller);
			startKeepAlive();
			controller.enqueue(new TextEncoder().encode(": connected\n\n"));
		},
		cancel() {
			streams.delete(streamController);
			if (streams.size === 0) stopKeepAlive();
		}
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no"
		}
	});
};

export const POST: RequestHandler = async ({ locals, request, getClientAddress, setHeaders }) => {
	if (env.REACTIONS === "false") {
		throw error(404, "Reactions are disabled");
	}

	if (!locals.user) {
		throw error(401, "Unauthorized");
	}

	let clientAddress = "unknown";
	try {
		clientAddress = getClientAddress();
	} catch {
		// The global limit still applies when no client address is available.
	}

	const rateLimit = reactionRateLimiter.consume(clientAddress);
	if (!rateLimit.allowed) {
		setHeaders({ "Retry-After": rateLimit.retryAfterSeconds.toString() });
		throw error(429, "Too many reactions. Slow down a little.");
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body.id !== "string") {
		throw error(400, "Missing or invalid reaction id");
	}

	if (!validReactionIds.has(body.id)) {
		throw error(400, "Unknown reaction id");
	}

	broadcast("reaction", JSON.stringify({ id: body.id, timestamp: Date.now() }));

	return json({ success: true });
};
