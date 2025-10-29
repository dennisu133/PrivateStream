import { startWhep, type WhepOptions } from "$lib/webrtc/whep";

export function whep(
  node: HTMLVideoElement,
  options: WhepOptions | null | undefined
) {
  let currentOptions = options;
  let controller = currentOptions?.endpoint
    ? startWhep(node, currentOptions)
    : null;

  return {
    update(next: WhepOptions | null | undefined) {
      if (next?.endpoint === currentOptions?.endpoint) return;

      // restart if endpoint toggled/changed
      controller?.destroy();
      currentOptions = next;
      controller = currentOptions?.endpoint
        ? startWhep(node, currentOptions)
        : null;
    },
    destroy() {
      controller?.destroy();
      controller = null;
    },
  };
}
