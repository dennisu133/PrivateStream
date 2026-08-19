import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { createPublicIpResolver } from "$lib/server/public-ip";
import { toProxySessionPath, toSrsSessionUrl } from "$lib/server/whep-session";
import type { RequestHandler } from "./$types";

const SRS_WHEP_URL = env.SRS_WHEP_URL;
const FORWARD_TIMEOUT_MS = 10_000;
// Leave plenty of room for SDP while rejecting oversized request bodies.
const MAX_SDP_BYTES = 100_000;

const DEFAULT_IP_LOOKUP_URLS = [
	"https://api.ipify.org",
	"https://ipv4.icanhazip.com",
	"https://checkip.amazonaws.com"
];

const configuredLookupUrls = env.IP_LOOKUP_URLS?.split(",")
	.map((url) => url.trim())
	.filter(Boolean);

const ipResolver = createPublicIpResolver({
	staticIp: env.SERVER_PUBLIC_IP?.trim() || undefined,
	lookupUrls: configuredLookupUrls?.length ? configuredLookupUrls : DEFAULT_IP_LOOKUP_URLS,
	log: (message) => console.warn("[WHEP]", message)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}
	if (!SRS_WHEP_URL) {
		throw error(500, "Missing SRS_WHEP_URL");
	}

	const offerSdp = await request.text();
	if (!offerSdp) {
		throw error(400, "Missing SDP offer");
	}
	if (offerSdp.length > MAX_SDP_BYTES) {
		throw error(413, "SDP offer too large");
	}

	let serverIp: string;
	try {
		serverIp = await ipResolver.resolve();
	} catch {
		throw error(502, "Could not determine the server public IP");
	}

	const target = new URL(SRS_WHEP_URL);
	target.searchParams.set("eip", serverIp);

	console.log("[WHEP] Proxy ->", target.toString());
	const res = await fetch(target, {
		method: "POST",
		headers: { "Content-Type": "application/sdp" },
		body: offerSdp,
		signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS)
	}).catch(() => {
		throw error(502, "Could not reach the SRS server");
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("[WHEP] SRS error", res.status, res.statusText, text);
		throw error(res.status, text || "SRS error");
	}

	const answerSdp = await res.text();
	const headers: Record<string, string> = { "Content-Type": "application/sdp" };

	// Keep teardown on the authenticated proxy instead of exposing SRS.
	const srsLocation = res.headers.get("location");
	const sessionPath = srsLocation && toProxySessionPath(srsLocation, SRS_WHEP_URL);
	if (sessionPath) {
		headers.Location = sessionPath;
	}

	console.log("[WHEP] Proxy <- 200 answer", sessionPath ?? "(no session location)");
	return new Response(answerSdp, { headers });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		throw error(401, "Unauthorized");
	}
	if (!SRS_WHEP_URL) {
		throw error(500, "Missing SRS_WHEP_URL");
	}

	const location = url.searchParams.get("loc");
	if (!location) {
		throw error(400, "Missing session location");
	}

	const target = toSrsSessionUrl(location, SRS_WHEP_URL);
	if (!target) {
		throw error(400, "Invalid session location");
	}

	console.log("[WHEP] Proxy -> DELETE", target.toString());
	const res = await fetch(target, {
		method: "DELETE",
		signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS)
	}).catch(() => {
		throw error(502, "Could not reach the SRS server");
	});

	// An expired SRS session is already torn down, so treat 404 as success.
	if (!res.ok && res.status !== 404) {
		console.error("[WHEP] SRS session delete failed", res.status, res.statusText);
		throw error(502, "SRS refused to delete the session");
	}

	return new Response(null, { status: 204 });
};
