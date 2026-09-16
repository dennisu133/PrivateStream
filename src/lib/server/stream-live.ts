import { env } from "$env/dynamic/private";
import { createStreamStatus } from "./stream-status";

// The SRS HTTP API lives on the same origin as the WHEP endpoint (port 1985).
function srsUrl(): URL | null {
	try {
		return env.SRS_WHEP_URL ? new URL(env.SRS_WHEP_URL) : null;
	} catch {
		return null;
	}
}

const whepUrl = srsUrl();

export const streamStatus = createStreamStatus({
	srsStreamsUrl: whepUrl ? new URL("/api/v1/streams/", whepUrl) : null,
	stream: {
		app: whepUrl?.searchParams.get("app") ?? "live",
		name: whepUrl?.searchParams.get("stream") ?? "livestream"
	},
	log: (message) => console.warn("[Stream]", message)
});
