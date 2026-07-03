import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { createPublicIpResolver } from "$lib/server/public-ip";
import type { RequestHandler } from "./$types";

const SRS_WHEP_URL = env.SRS_WHEP_URL;
const FORWARD_TIMEOUT_MS = 10_000;

// Plain-text echo services that return the caller's IP as the response body.
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

async function fetchWithTimeout(input: string | URL, init: RequestInit | undefined, ms: number) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	try {
		return await fetch(input, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

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

	let serverIp: string;
	try {
		serverIp = await ipResolver.resolve();
	} catch {
		throw error(502, "Could not determine the server public IP");
	}

	const target = new URL(SRS_WHEP_URL);
	target.searchParams.set("eip", serverIp);

	console.log("[WHEP] Proxy ->", target.toString());
	const res = await fetchWithTimeout(
		target.toString(),
		{
			method: "POST",
			headers: { "Content-Type": "application/sdp" },
			body: offerSdp
		},
		FORWARD_TIMEOUT_MS
	).catch(() => {
		throw error(502, "Could not reach the SRS server");
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("[WHEP] SRS error", res.status, res.statusText, text);
		throw error(res.status, text || "SRS error");
	}

	const answerSdp = await res.text();
	console.log("[WHEP] Proxy <- 200 answer");
	return new Response(answerSdp, {
		status: 200,
		headers: { "Content-Type": "application/sdp" }
	});
};
