import type { Attachment } from "svelte/attachments";

export type ResizableOptions = {
	/**
	 * Selector for the child that defines the resizable content, when the element
	 * also holds things that aren't part of it - a caption or status line under a
	 * frame, say. Handles then sit in the padding ring just outside that child on
	 * all four sides, rather than being pushed below the trailing content.
	 */
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

/**
 * Creates a resizable attachment that reads size constraints from CSS.
 * Set min-width and max-width on the element to control bounds.
 * Aspect ratio is calculated dynamically from the element's dimensions.
 *
 * @example
 * ```svelte
 * <div
 *   class="min-w-80 max-w-[90vw] w-[70vw]"
 *   {@attach resizable()}
 * >
 *   Content
 * </div>
 * ```
 */
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

		/**
		 * Height of the resizable surface. Without a surface child this is just
		 * the element. With one, it is that child plus the padding ring the
		 * handles live in - which is exactly how the left, right and top edges
		 * already behave, so the bottom band ends up symmetric with them.
		 */
		const getSurfaceHeight = (rect: DOMRect) => {
			const surface = surfaceSelector ? element.querySelector(surfaceSelector) : null;
			if (!surface) return rect.height;
			return surface.getBoundingClientRect().bottom - rect.top + EDGE_THRESHOLD;
		};

		/** Get current aspect ratio from the resizable surface */
		const getAspectRatio = () => {
			const rect = element.getBoundingClientRect();
			const height = getSurfaceHeight(rect);
			return height > 0 ? rect.width / height : 1;
		};

		/** Get min/max constraints from CSS computed styles */
		const getConstraints = () => {
			const style = getComputedStyle(element);
			const minWidth = parseFloat(style.minWidth) || 0;
			// maxWidth can be "none" which parses to NaN
			let maxWidth = parseFloat(style.maxWidth);
			if (!Number.isFinite(maxWidth)) maxWidth = Infinity;

			// Also constrain by viewport height (prevent overflow)
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

			// Below the surface there is no handle - otherwise the left/right bands
			// would keep reaching down beside the trailing content.
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

			// Update cursor based on current pointer position
			updateCursor(getEdgeFromPosition(e.clientX, e.clientY));
		};

		const handlePointerLeave = () => {
			if (!activeEdge) {
				updateCursor(null);
			}
		};

		// Media query handling
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

		// Setup
		element.addEventListener("pointerdown", handlePointerDown);
		element.addEventListener("pointermove", handlePointerMove);
		element.addEventListener("pointerup", handlePointerUp);
		element.addEventListener("pointercancel", handlePointerUp);
		element.addEventListener("pointerleave", handlePointerLeave);
		mediaQuery.addEventListener("change", handleMediaChange);
		handleMediaChange(mediaQuery);

		// Cleanup
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
