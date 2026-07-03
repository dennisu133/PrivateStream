import { error, json } from "@sveltejs/kit";
import { createFixedWindowRateLimiter } from "$lib/server/rate-limit";
import type { RequestHandler } from "./$types";

// Generous enough for enthusiastic spamming, tight enough that one viewer
// cannot flood every other client's overlay indefinitely.
const reactionRateLimiter = createFixedWindowRateLimiter({
	windowMs: 10_000,
	perKeyLimit: 30,
	globalLimit: 120
});

// --- SSE client management ---

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

// --- Reaction validation (server-side asset list) ---

const reactionModules = import.meta.glob<{ default: string }>(
	"$lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}",
	{ eager: true }
);

const validReactionIds = new Set(
	Object.keys(reactionModules).map((path) => path.split("/").pop()!)
);

// --- Handlers ---

/**
 * SSE endpoint: clients connect here to receive real-time reaction events.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}

	let streamController: ReadableStreamDefaultController;

	const stream = new ReadableStream({
		start(controller) {
			streamController = controller;
			streams.add(controller);
			startKeepAlive();
			controller.enqueue(new TextEncoder().encode("event: connected\ndata: {}\n\n"));
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

/**
 * POST endpoint: trigger a reaction broadcast.
 * Body: { id: string }
 */
export const POST: RequestHandler = async ({ locals, request, getClientAddress, setHeaders }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}

	let clientAddress = "unknown";
	try {
		clientAddress = getClientAddress();
	} catch {
		// The global limit still applies if the adapter cannot resolve an address.
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

	const event = {
		id: body.id,
		timestamp: Date.now()
	};

	broadcast("reaction", JSON.stringify(event));

	return json({ success: true });
};
