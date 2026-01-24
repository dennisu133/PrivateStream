import type { ConnectionState, ReceivingState } from "$lib/types";

let connectionState = $state<ConnectionState>("new");
let streamStatus = $state<ReceivingState>("pending");

export function getConnectionState() {
	return connectionState;
}

export function getStreamStatus() {
	return streamStatus;
}

export function setConnectionState(state: ConnectionState) {
	connectionState = state;
}

export function setStreamStatus(status: ReceivingState) {
	streamStatus = status;
}
