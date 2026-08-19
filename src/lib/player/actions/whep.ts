import type { ReceivingState } from "$lib/types";

type WhepOptions = {
	onStateChange?: (state: RTCPeerConnectionState) => void;
	onReceivingChange?: (state: ReceivingState) => void;
};

const ENDPOINT = "/api/whep";
const RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30_000;
const WATCHDOG_INTERVAL_MS = 2000;
// Renegotiate when a "connected" session has delivered no media for this long.
const STALL_RECONNECT_MS = 10_000;
// "disconnected" is often a transient ICE hiccup that recovers on its own;
// wait at least this long before tearing the connection down.
const DISCONNECTED_GRACE_MS = 5000;

export function startWhep(videoEl: HTMLVideoElement, opts: WhepOptions = {}) {
	let stopped = false;
	let pc: RTCPeerConnection | null = null;
	let reconnectTimer: number | null = null;
	let statsTimer: number | null = null;
	let receiving: ReceivingState = "pending";
	let last = { bytes: 0, updatedAt: 0 };
	let currentReconnectDelayMs = RECONNECT_DELAY_MS;
	let sessionUrl: string | null = null;

	console.log("[WHEP] Starting WHEP connection");

	const setReceiving = (next: ReceivingState) => {
		if (receiving === next) return;
		receiving = next;
		opts.onReceivingChange?.(receiving);
	};

	// Tear down the current session on SRS (fire-and-forget). Without this,
	// every reconnect leaves a zombie session behind until SRS times it out.
	const deleteSession = () => {
		const url = sessionUrl;
		sessionUrl = null;
		// Only same-origin proxy paths issued by our own backend are used.
		if (!url || !url.startsWith("/")) return;
		console.log("[WHEP] Deleting session", url);
		fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
	};

	// Close the peer connection and stop all tracks without marking the
	// controller stopped, so a later connect() can bring the session back.
	const closeConnection = () => {
		clearReconnect();
		try {
			pc?.close();
		} catch {}
		pc = null;
		try {
			const ms = videoEl.srcObject as MediaStream | null;
			ms?.getTracks().forEach((t) => t.stop());
		} catch {}
		videoEl.srcObject = null;
		setReceiving("idle");
	};

	// `keepalive` lets the DELETE survive the page being closed. The connection
	// must be fully torn down even for bfcache suspensions: an open
	// RTCPeerConnection or live MediaStreamTrack makes the page ineligible for
	// the back/forward cache, so we close everything and rebuild on pageshow.
	const onPageHide = () => {
		deleteSession();
		closeConnection();
	};
	const onPageShow = (e: PageTransitionEvent) => {
		if (e.persisted && !stopped) void connect();
	};
	window.addEventListener("pagehide", onPageHide);
	window.addEventListener("pageshow", onPageShow);

	const clearReconnect = () => {
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const scheduleReconnect = (delayMs = currentReconnectDelayMs) => {
		if (stopped || reconnectTimer !== null) return;
		console.warn(`[WHEP] Scheduling reconnect in ${delayMs}ms`);
		reconnectTimer = window.setTimeout(() => {
			reconnectTimer = null;
			void connect();
		}, delayMs);
	};

	const negotiate = async (target: RTCPeerConnection) => {
		const offer = await target.createOffer();
		await target.setLocalDescription(offer);
		const res = await fetch(ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/sdp" },
			body: target.localDescription?.sdp ?? ""
		});
		if (!res.ok) throw new Error(`WHEP HTTP ${res.status} ${res.statusText}`);
		sessionUrl = res.headers.get("Location");
		const answer = await res.text();
		await target.setRemoteDescription({ type: "answer", sdp: answer });
		console.log("[WHEP] Connection negotiation successful");
	};

	const connect = async () => {
		if (stopped) return;
		clearReconnect();
		deleteSession();
		last = { bytes: 0, updatedAt: 0 };
		setReceiving("pending");
		try {
			pc?.close();
		} catch {}
		pc = new RTCPeerConnection();
		const localPc = pc;

		localPc.addTransceiver("video", { direction: "recvonly" });
		localPc.addTransceiver("audio", { direction: "recvonly" });

		localPc.ontrack = (e) => {
			console.log(`[WHEP] ${e.track?.kind} track received `, e.track);
			const stream = e.streams?.[0];
			if (stream && videoEl.srcObject !== stream) {
				videoEl.srcObject = stream;
			}
		};

		localPc.onconnectionstatechange = () => {
			if (localPc !== pc) return;
			const state = localPc.connectionState;
			console.log("[WHEP] RTC state:", state);
			opts.onStateChange?.(state);
			if (state === "connected") {
				clearReconnect();
				return;
			}
			if (state === "disconnected") {
				setReceiving("idle");
				scheduleReconnect(Math.max(currentReconnectDelayMs, DISCONNECTED_GRACE_MS));
			} else if (state === "failed" || state === "closed") {
				setReceiving("idle");
				scheduleReconnect();
			}
		};

		try {
			await negotiate(localPc);
		} catch (e) {
			console.error("[WHEP] Connection negotiation failed", e);
			currentReconnectDelayMs = Math.min(MAX_RECONNECT_DELAY_MS, currentReconnectDelayMs * 2);
			scheduleReconnect();
		}
	};

	const checkStats = async () => {
		if (stopped || !pc || pc.connectionState !== "connected") return;
		try {
			const reports = await pc.getStats();
			let bytes = 0;
			for (const rep of reports.values()) {
				if (
					rep.type === "inbound-rtp" &&
					((rep as any).kind === "video" || (rep as any).mediaType === "video")
				) {
					bytes = Math.max(bytes, (rep as any).bytesReceived ?? 0);
				}
			}
			const now = Date.now();
			const dataReceived = bytes > last.bytes;
			if (last.updatedAt === 0 || dataReceived) {
				last = { bytes, updatedAt: now };
				if (dataReceived) {
					// Media is flowing again; cancel any pending stall reconnect
					// and reset the backoff only on proof of a healthy stream.
					clearReconnect();
					currentReconnectDelayMs = RECONNECT_DELAY_MS;
				}
				if (bytes > 0 && receiving !== "live") {
					console.log("[WHEP] Data received");
					setReceiving("live");
				}
			} else if (now - last.updatedAt >= WATCHDOG_INTERVAL_MS) {
				if (receiving === "live") {
					console.warn(`[WHEP] No data received for ${WATCHDOG_INTERVAL_MS}ms`);
				}
				setReceiving("idle");

				// A session that stays "connected" without media (e.g. SRS kept
				// it alive across a publisher restart) never fires a state
				// change, so renegotiate ourselves once the stall persists.
				if (now - last.updatedAt >= STALL_RECONNECT_MS && reconnectTimer === null) {
					console.warn(`[WHEP] No data for ${STALL_RECONNECT_MS}ms while connected; renegotiating`);
					currentReconnectDelayMs = Math.min(MAX_RECONNECT_DELAY_MS, currentReconnectDelayMs * 2);
					scheduleReconnect();
				}
			}
		} catch {}
	};

	void connect();
	statsTimer = window.setInterval(() => void checkStats(), WATCHDOG_INTERVAL_MS);

	return {
		destroy: () => {
			if (stopped) return;
			stopped = true;
			console.warn("[WHEP] Closing connection");
			window.removeEventListener("pagehide", onPageHide);
			window.removeEventListener("pageshow", onPageShow);
			deleteSession();
			if (statsTimer !== null) {
				clearInterval(statsTimer);
				statsTimer = null;
			}
			closeConnection();
		}
	};
}
