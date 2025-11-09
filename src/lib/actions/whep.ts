import { startWhep, type WhepOptions } from "$lib/webrtc/whep";

export function whep(
  node: HTMLVideoElement,
  options: WhepOptions | null | undefined
) {
  let currentOptions = options;
  let controller = currentOptions?.endpoint
    ? startWhep(node, currentOptions)
    : null;
  let prev = {
    endpoint: currentOptions?.endpoint,
    initialReconnectDelay: currentOptions?.initialReconnectDelay,
    maxReconnectDelay: currentOptions?.maxReconnectDelay,
    onStateChange: currentOptions?.onStateChange,
  };

  return {
    update(next: WhepOptions | null | undefined) {
      const same =
        next?.endpoint === prev.endpoint &&
        next?.initialReconnectDelay === prev.initialReconnectDelay &&
        next?.maxReconnectDelay === prev.maxReconnectDelay &&
        next?.onStateChange === prev.onStateChange;
      if (same) return;

      // restart if any meaningful option changed
      controller?.destroy();
      currentOptions = next;
      controller = currentOptions?.endpoint
        ? startWhep(node, currentOptions)
        : null;
      prev = {
        endpoint: currentOptions?.endpoint,
        initialReconnectDelay: currentOptions?.initialReconnectDelay,
        maxReconnectDelay: currentOptions?.maxReconnectDelay,
        onStateChange: currentOptions?.onStateChange,
      };
    },
    destroy() {
      controller?.destroy();
      controller = null;
    },
  };
}
