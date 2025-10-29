export type WhepOptions = {
  endpoint?: string;
  onStateChange?: (state: RTCPeerConnectionState) => void;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
};

async function negotiate(pc: RTCPeerConnection, endpoint: string) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  console.log('[WHEP] Posting SDP to endpoint', endpoint);
  const response = await fetch(endpoint, {
    method: 'POST',
    body: pc.localDescription?.sdp,
    headers: { 'Content-Type': 'application/sdp' }
  });

  if (!response.ok) {
    console.error('[WHEP] WHEP request failed', response.status, response.statusText);
    throw new Error(`WHEP failed: ${response.status} ${response.statusText}`);
  }

  const answerSdp = await response.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  console.log('[WHEP] Connection negotiation successful');
}

export function startWhep(videoEl: HTMLVideoElement, opts: WhepOptions = {}) {
  const endpoint = opts.endpoint ?? '/api/whep';
  const initialDelay = opts.initialReconnectDelay ?? 1000;
  const maxDelay = opts.maxReconnectDelay ?? 30000;
  let currentReconnectDelay = initialDelay;

  console.log('[WHEP] Starting WHEP connection', { endpoint });
  const pc = new RTCPeerConnection();

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  pc.ontrack = (event) => {
    console.log(`[WHEP] ${event.track?.kind} track received `, event.track);
    const video = videoEl;
    if (!video) return;
    const incoming = event.streams?.[0];
    if (incoming && video.srcObject !== incoming) {
      video.srcObject = incoming;
    }
  };

  let reconnectTimer: number | null = null;
  const scheduleReconnect = () => {
    if (reconnectTimer !== null || closed) return;

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      if (closed) return;

      console.warn(`[WHEP] Attempting reconnect`);
      negotiate(pc, endpoint)
        .then(() => {
          console.log('[WHEP] Reconnected successfully');
        })
        .catch((e) => {
          console.error('[WHEP] Reconnect attempt failed', e);
          // Increase delay for next attempt
          currentReconnectDelay = Math.min(maxDelay, currentReconnectDelay * 2);
          scheduleReconnect();
        });
    }, currentReconnectDelay);
  };

  pc.onconnectionstatechange = () => {
    console.log('[WHEP] state', pc.connectionState);
    opts.onStateChange?.(pc.connectionState);

    if (pc.connectionState === 'connected') {
      // If we are connected, reset the reconnect delay
      currentReconnectDelay = initialDelay;
    }

    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      scheduleReconnect();
    }
  };

  negotiate(pc, endpoint).catch((e) => {
    console.error('Error starting WHEP stream:', e);
    if (!closed) {
      scheduleReconnect();
    }
  });

  let closed = false;
  return {
    pc,
    destroy() {
      if (closed) return;
      closed = true;
      console.log('[WHEP] Closing connection');
      try {
        pc.close();
      } catch { }
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }
  };
}
