import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";

const SRS_WHEP_URL = env.SRS_WHEP_URL;
const FORWARD_TIMEOUT_MS = 10_000;
const IPIFY_URL = "https://api.ipify.org";
const IPIFY_TIMEOUT_MS = 5_000;
const IPIFY_CACHE_MS = 5 * 60 * 1000;

type CachedIp = { value: string; expiresAt: number } | null;

let cachedServerIp: CachedIp = null;

function withTimeout(
	input: RequestInfo | URL,
	init: RequestInit | undefined,
	ms: number,
) {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), ms);
	return {
		fetch: () =>
			fetch(input, { ...init, signal: controller.signal }).finally(() =>
				clearTimeout(t),
			),
	};
}

async function resolveServerIp() {
	const now = Date.now();
	if (cachedServerIp && cachedServerIp.expiresAt > now) {
		return cachedServerIp.value;
	}

	const { fetch: timedFetch } = withTimeout(
		IPIFY_URL,
		undefined,
		IPIFY_TIMEOUT_MS,
	);
	const res = await timedFetch();
	if (!res.ok) {
		throw error(res.status, "Failed to resolve server IP");
	}
	const ip = (await res.text()).trim();
	if (!ip) throw error(500, "Empty IP received from ipify");
	cachedServerIp = { value: ip, expiresAt: now + IPIFY_CACHE_MS };
	return ip;
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

	const serverIp = await resolveServerIp();

	const target = new URL(SRS_WHEP_URL);
	target.searchParams.set("eip", serverIp);

	console.log("[WHEP] Proxy ->", target.toString());
	const { fetch: _fetch } = withTimeout(
		target.toString(),
		{
			method: "POST",
			headers: { "Content-Type": "application/sdp" },
			body: offerSdp,
		},
		FORWARD_TIMEOUT_MS,
	);

	const res = await _fetch();
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("[WHEP] SRS error", res.status, res.statusText, text);
		throw error(res.status, text || "SRS error");
	}

	const answerSdp = await res.text();
	console.log("[WHEP] Proxy <- 200 answer");
	return new Response(answerSdp, {
		status: 200,
		headers: { "Content-Type": "application/sdp" },
	});
};
