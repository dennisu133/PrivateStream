import type { Attachment } from "svelte/attachments";

export type ResizableOptions = {
	/** Child that defines the resize surface when the element has trailing content. */
	surfaceSelector?: string;
};

type Edge =
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| null;

const EDGE_THRESHOLD = 12;
const DESKTOP_QUERY = "(min-width: 900px)";

const CURSOR_MAP: Record<NonNullable<Edge>, string> = {
	top: "ns-resize",
	bottom: "ns-resize",
	left: "ew-resize",
	right: "ew-resize",
	"top-left": "nwse-resize",
	"bottom-right": "nwse-resize",
	"top-right": "nesw-resize",
	"bottom-left": "nesw-resize"
};

/** Adds aspect-ratio-preserving edge handles using the element's CSS width constraints. */
export function resizable(options: ResizableOptions = {}): Attachment<HTMLElement> {
	const { surfaceSelector } = options;

	return (element) => {
		let isResizable = false;
		let activeEdge: Edge = null;
		let dragStartX = 0;
		let dragStartY = 0;
		let dragStartWidth = 0;
		let dragAspectRatio = 1;

		const isFullscreen = () => document.fullscreenElement !== null;

		// Include the padding ring but exclude trailing content such as the status bar.
		const getSurfaceHeight = (rect: DOMRect) => {
			const surface = surfaceSelector ? element.querySelector(surfaceSelector) : null;
			if (!surface) return rect.height;
			return surface.getBoundingClientRect().bottom - rect.top + EDGE_THRESHOLD;
		};

		const getAspectRatio = () => {
			const rect = element.getBoundingClientRect();
			const height = getSurfaceHeight(rect);
			return height > 0 ? rect.width / height : 1;
		};

		const getConstraints = () => {
			const style = getComputedStyle(element);
			const minWidth = parseFloat(style.minWidth) || 0;
			let maxWidth = parseFloat(style.maxWidth);
			if (!Number.isFinite(maxWidth)) maxWidth = Infinity;

			// Keep the surface within 90% of the viewport height.
			const availableHeight = window.innerHeight * 0.9;
			const aspectRatio = getAspectRatio();
			const maxFromHeight = availableHeight * aspectRatio;

			return {
				min: minWidth,
				max: Math.min(maxWidth, maxFromHeight)
			};
		};

		const clampWidth = (value: number) => {
			const { min, max } = getConstraints();
			return Math.min(Math.max(value, min), max);
		};

		const setDataAttr = (name: string, value: string | null) => {
			if (value === null) {
				element.removeAttribute(`data-${name}`);
			} else {
				element.setAttribute(`data-${name}`, value);
			}
		};

		const updateCursor = (edge: Edge) => {
			if (edge && isResizable) {
				element.style.cursor = CURSOR_MAP[edge];
				setDataAttr("resize-edge", edge);
			} else {
				element.style.cursor = "";
				setDataAttr("resize-edge", null);
			}
		};

		const enforceBounds = () => {
			if (!isResizable || !element.style.width) return;
			const currentWidth = element.getBoundingClientRect().width;
			const clampedWidth = clampWidth(currentWidth);
			if (Math.abs(currentWidth - clampedWidth) > 1) {
				element.style.width = `${clampedWidth}px`;
			}
		};

		const getEdgeFromPosition = (clientX: number, clientY: number): Edge => {
			const rect = element.getBoundingClientRect();
			const x = clientX - rect.left;
			const y = clientY - rect.top;

			// Do not extend side handles beside trailing content.
			const surfaceHeight = getSurfaceHeight(rect);
			if (y > surfaceHeight) return null;

			const nearTop = y < EDGE_THRESHOLD;
			const nearBottom = y > surfaceHeight - EDGE_THRESHOLD;
			const nearLeft = x < EDGE_THRESHOLD;
			const nearRight = x > rect.width - EDGE_THRESHOLD;

			if (nearTop && nearLeft) return "top-left";
			if (nearTop && nearRight) return "top-right";
			if (nearBottom && nearLeft) return "bottom-left";
			if (nearBottom && nearRight) return "bottom-right";
			if (nearTop) return "top";
			if (nearBottom) return "bottom";
			if (nearLeft) return "left";
			if (nearRight) return "right";

			return null;
		};

		const handlePointerDown = (e: PointerEvent) => {
			if (!isResizable || isFullscreen() || e.target !== element) return;

			const edge = getEdgeFromPosition(e.clientX, e.clientY);
			if (!edge) return;

			e.preventDefault();
			activeEdge = edge;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragStartWidth = element.getBoundingClientRect().width;
			dragAspectRatio = getAspectRatio();

			setDataAttr("resizing", "true");
			element.style.touchAction = "none";
			element.setPointerCapture(e.pointerId);
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!isResizable || isFullscreen()) return;

			if (activeEdge) {
				e.preventDefault();
				const deltaX = e.clientX - dragStartX;
				const deltaY = e.clientY - dragStartY;

				let newWidth: number;

				switch (activeEdge) {
					case "right":
					case "top-right":
					case "bottom-right":
						newWidth = dragStartWidth + deltaX;
						break;
					case "left":
					case "top-left":
					case "bottom-left":
						newWidth = dragStartWidth - deltaX;
						break;
					case "bottom":
						newWidth = dragStartWidth + deltaY * dragAspectRatio;
						break;
					case "top":
						newWidth = dragStartWidth - deltaY * dragAspectRatio;
						break;
					default:
						return;
				}

				element.style.width = `${clampWidth(newWidth)}px`;
			} else if (e.target === element) {
				updateCursor(getEdgeFromPosition(e.clientX, e.clientY));
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
			if (!activeEdge) return;

			element.releasePointerCapture(e.pointerId);
			activeEdge = null;
			setDataAttr("resizing", null);
			element.style.touchAction = "";

			updateCursor(getEdgeFromPosition(e.clientX, e.clientY));
		};

		const handlePointerLeave = () => {
			if (!activeEdge) {
				updateCursor(null);
			}
		};

		const mediaQuery = window.matchMedia(DESKTOP_QUERY);

		const enableResize = () => {
			isResizable = true;
			setDataAttr("resizable", "true");
			element.style.touchAction = "none";
			window.addEventListener("resize", enforceBounds);
			enforceBounds();
		};

		const disableResize = () => {
			isResizable = false;
			setDataAttr("resizable", null);
			setDataAttr("resizing", null);
			setDataAttr("resize-edge", null);
			element.style.width = "";
			element.style.cursor = "";
			element.style.touchAction = "";
			window.removeEventListener("resize", enforceBounds);
		};

		const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
			if (e.matches) {
				enableResize();
			} else {
				disableResize();
			}
		};

		element.addEventListener("pointerdown", handlePointerDown);
		element.addEventListener("pointermove", handlePointerMove);
		element.addEventListener("pointerup", handlePointerUp);
		element.addEventListener("pointercancel", handlePointerUp);
		element.addEventListener("pointerleave", handlePointerLeave);
		mediaQuery.addEventListener("change", handleMediaChange);
		handleMediaChange(mediaQuery);

		return () => {
			element.removeEventListener("pointerdown", handlePointerDown);
			element.removeEventListener("pointermove", handlePointerMove);
			element.removeEventListener("pointerup", handlePointerUp);
			element.removeEventListener("pointercancel", handlePointerUp);
			element.removeEventListener("pointerleave", handlePointerLeave);
			mediaQuery.removeEventListener("change", handleMediaChange);
			disableResize();
		};
	};
}
