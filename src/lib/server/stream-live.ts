import { env } from "$env/dynamic/private";
import { createStreamStatus } from "./stream-status";

// The SRS HTTP API lives on the same origin as the WHEP endpoint (port 1985).
function srsStreamsUrl(): URL | null {
	try {
		return env.SRS_WHEP_URL ? new URL("/api/v1/streams/", env.SRS_WHEP_URL) : null;
	} catch {
		return null;
	}
}

export const streamStatus = createStreamStatus({
	srsStreamsUrl: srsStreamsUrl(),
	log: (message) => console.warn("[Stream]", message)
});
