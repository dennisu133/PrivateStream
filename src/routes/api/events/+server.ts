import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

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
  for (const s of subscribers) {
    try {
      s.write(msg);
    } catch {}
  }
}

export const GET: RequestHandler = async ({ request, locals }) => {
  // API Route Guard for SSE
  if (!locals.user) {
    throw error(
      401,
      "Unauthorized: You must be verified to subscribe to events."
    );
  }

  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let closed = false;
  let unsubscribe: () => void = () => {};

  const cleanup = () => {
    if (closed) return;
    closed = true;
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
  const pingId = setInterval(
    () => sink.write("event: ping\ndata: {}\n\n"),
    25000
  );

  // Abort when client disconnects
  request.signal.addEventListener(
    "abort",
    () => {
      clearInterval(pingId);
      cleanup();
    },
    { once: true }
  );

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized: You must be verified to send events.");
  }

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    throw error(400, "Bad Request: Expected JSON body");
  }

  if (!data || typeof (data as any).type !== "string") {
    throw error(
      400,
      "Bad Request: body must be { type: string, payload?: any }"
    );
  }

  const { type, payload } = data as { type: string; payload?: unknown };
  broadcast(type, payload ?? {});
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
