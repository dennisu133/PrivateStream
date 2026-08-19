import type { ReceivingState } from "$lib/types";

export const connection = $state({
	state: "new" as RTCPeerConnectionState,
	stream: "pending" as ReceivingState
});
