export type ReceivingState = "pending" | "live" | "idle";

export type WhepOptions = {
	endpoint?: string;
	onStateChange?: (state: RTCPeerConnectionState) => void;
	onReceivingChange?: (receiving: ReceivingState) => void;
	reconnectDelayMs?: number;
	maxReconnectDelayMs?: number;
};

export type WhepController = {
	pc: RTCPeerConnection | null;
	isReceiving: () => boolean;
	destroy: () => void;
};

const WATCHDOG_INTERVAL_MS = 2000;

export function startWhep(
	videoEl: HTMLVideoElement,
	opts: WhepOptions = {},
): WhepController {
	const endpoint = opts.endpoint ?? "/api/whep";
	const reconnectDelayMs = Math.max(250, opts.reconnectDelayMs ?? 1500);
	const maxReconnectDelayMs = Math.max(
		reconnectDelayMs,
		opts.maxReconnectDelayMs ?? 30000,
	);

	let stopped = false;
	let pc: RTCPeerConnection | null = null;
	let reconnectTimer: number | null = null;
	let statsTimer: number | null = null;
	let receiving: ReceivingState = "pending";
	let last = { bytes: 0, updatedAt: 0 };
	let currentReconnectDelayMs = reconnectDelayMs;

	console.log("[WHEP] Starting WHEP connection");

	const setReceiving = (next: ReceivingState) => {
		if (receiving === next) return;
		receiving = next;
		opts.onReceivingChange?.(receiving);
	};

	const clearReconnect = () => {
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const scheduleReconnect = () => {
		if (stopped || reconnectTimer !== null) return;
		console.warn(`[WHEP] Scheduling reconnect in ${currentReconnectDelayMs}ms`);
		reconnectTimer = window.setTimeout(() => {
			reconnectTimer = null;
			void connect();
		}, currentReconnectDelayMs);
	};

	const negotiate = async (target: RTCPeerConnection) => {
		const offer = await target.createOffer();
		await target.setLocalDescription(offer);
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/sdp" },
			body: target.localDescription?.sdp ?? "",
		});
		if (!res.ok) throw new Error(`WHEP HTTP ${res.status} ${res.statusText}`);
		const answer = await res.text();
		await target.setRemoteDescription({ type: "answer", sdp: answer });
		console.log("[WHEP] Connection negotiation successful");
	};

	const connect = async () => {
		if (stopped) return;
		clearReconnect();
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
			const state = localPc.connectionState;
			console.log("[WHEP] RTC state:", state);
			opts.onStateChange?.(state);
			if (state === "connected") {
				clearReconnect();
				currentReconnectDelayMs = reconnectDelayMs;
				return;
			}
			if (
				state === "disconnected" ||
				state === "failed" ||
				state === "closed"
			) {
				setReceiving("idle");
				scheduleReconnect();
			}
		};

		try {
			await negotiate(localPc);
		} catch (e) {
			console.error("[WHEP] Connection negotiation failed", e);
			currentReconnectDelayMs = Math.min(
				maxReconnectDelayMs,
				currentReconnectDelayMs * 2,
			);
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
				if (bytes > 0 && receiving !== "live") {
					console.log("[WHEP] Data received");
					setReceiving("live");
				}
			} else if (now - last.updatedAt >= WATCHDOG_INTERVAL_MS) {
				if (receiving === "live") {
					console.warn(`[WHEP] No data received for ${WATCHDOG_INTERVAL_MS}ms`);
				}
				setReceiving("idle");
			}
		} catch {}
	};

	void connect();
	statsTimer = window.setInterval(
		() => void checkStats(),
		WATCHDOG_INTERVAL_MS,
	);

	return {
		get pc() {
			return pc;
		},
		isReceiving: () => receiving === "live",
		destroy: () => {
			if (stopped) return;
			stopped = true;
			console.warn("[WHEP] Closing connection");
			clearReconnect();
			if (statsTimer !== null) {
				clearInterval(statsTimer);
				statsTimer = null;
			}
			try {
				pc?.close();
			} catch {}
			pc = null;
			setReceiving("idle");
			try {
				if (videoEl.srcObject) {
					const ms = videoEl.srcObject as MediaStream;
					ms.getTracks().forEach((t) => t.stop());
				}
			} catch {}
			videoEl.srcObject = null;
		},
	};
}
