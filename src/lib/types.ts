/** Indicator state for UI status displays */
export type IndicatorState = "ok" | "warn" | "pending";

/** Status indicator with state and label for display */
export type StatusIndicator = {
	state: IndicatorState;
	label: string;
};

/** WebRTC peer connection state (mirrors RTCPeerConnectionState) */
export type ConnectionState = RTCPeerConnectionState;

/** Stream receiving state for WHEP connections */
export type ReceivingState = "pending" | "live" | "idle";

/** Maps connection state to indicator for UI display */
export function getConnectionIndicator(state: ConnectionState): StatusIndicator {
	switch (state) {
		case "connected":
			return { state: "ok", label: "Connected" };
		case "failed":
			return { state: "warn", label: "Failed" };
		case "disconnected":
			return { state: "warn", label: "Disconnected" };
		case "closed":
			return { state: "warn", label: "Closed" };
		default:
			return { state: "pending", label: "Connecting..." };
	}
}

/** Maps receiving state to indicator for UI display */
export function getStreamIndicator(state: ReceivingState): StatusIndicator {
	switch (state) {
		case "live":
			return { state: "ok", label: "Live" };
		case "idle":
			return { state: "warn", label: "No Stream" };
		default:
			return { state: "pending", label: "Checking..." };
	}
}
