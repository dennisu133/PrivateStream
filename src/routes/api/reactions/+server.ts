import { error, json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { clientKey, createFixedWindowRateLimiter } from "$lib/server/rate-limit";
import { reactions } from "$lib/player/reactions/reactions";
import type { RequestHandler } from "./$types";

// Allow bursts without letting one viewer dominate the overlay.
const reactionRateLimiter = createFixedWindowRateLimiter({
	windowMs: 10_000,
	perKeyLimit: 30,
	globalLimit: 120
});

const validReactionIds = new Set(reactions.map((r) => r.id));

const encoder = new TextEncoder();
const streams = new Set<ReadableStreamDefaultController>();
const KEEPALIVE_INTERVAL = 15_000;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

/** Enqueueing on a stream the client has dropped throws, which is how they get pruned. */
function send(frame: string) {
	const bytes = encoder.encode(frame);
	for (const controller of streams) {
		try {
			controller.enqueue(bytes);
		} catch {
			streams.delete(controller);
		}
	}
}

function startKeepAlive() {
	// Proxies drop idle connections, so a comment frame holds them open.
	keepAliveTimer ??= setInterval(() => {
		send(": keepalive\n\n");
		if (streams.size === 0) stopKeepAlive();
	}, KEEPALIVE_INTERVAL);
}

function stopKeepAlive() {
	if (keepAliveTimer) {
		clearInterval(keepAliveTimer);
		keepAliveTimer = null;
	}
}

function requireReactionAccess(locals: App.Locals) {
	if (env.REACTIONS === "false") {
		throw error(404, "Reactions are disabled");
	}

	if (!locals.user) {
		throw error(401, "Unauthorized");
	}
}

export const GET: RequestHandler = ({ locals }) => {
	requireReactionAccess(locals);

	let streamController: ReadableStreamDefaultController;

	const stream = new ReadableStream({
		start(controller) {
			streamController = controller;
			streams.add(controller);
			startKeepAlive();
			controller.enqueue(encoder.encode(": connected\n\n"));
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
			"X-Accel-Buffering": "no"
		}
	});
};

export const POST: RequestHandler = async ({ locals, request, getClientAddress, setHeaders }) => {
	requireReactionAccess(locals);

	const rateLimit = reactionRateLimiter.consume(clientKey(getClientAddress));
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

	send(`event: reaction\ndata: ${JSON.stringify({ id: body.id })}\n\n`);

	return json({ success: true });
};
