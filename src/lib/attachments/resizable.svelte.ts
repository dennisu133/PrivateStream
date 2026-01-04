import type { Attachment } from "svelte/attachments";

export type ResizableOptions = {
	aspectRatio?: number;
	/** Minimum width as percentage of viewport width (0-100) */
	minWidthVw?: number;
	/** Maximum width as percentage of viewport width (0-100) */
	maxWidthVw?: number;
	/** Padding from viewport edges as percentage of viewport width */
	viewportPaddingVw?: number;
	/** Height reserved for chrome/UI elements as percentage of viewport height */
	chromeHeightVh?: number;
	desktopQuery?: string;
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
 * Creates a resizable attachment that can be applied to any element.
 * Uses CSS-first approach with JavaScript only for drag calculations.
 * All size constraints are viewport-relative for consistent scaling across display densities.
 *
 * The attachment sets the following data attributes on the element:
 * - `data-resizable`: "true" when resizing is enabled (desktop viewport)
 * - `data-resizing`: "true" while actively dragging to resize
 * - `data-resize-edge`: the edge being hovered/dragged (for cursor styling)
 *
 * @example
 * ```svelte
 * <div {@attach resizable({ aspectRatio: 16/9, minWidthVw: 30, maxWidthVw: 90 })}>
 *   Content
 * </div>
 * ```
 */
export function resizable(options: ResizableOptions = {}): Attachment<HTMLElement> {
	const {
		aspectRatio = 16 / 9,
		minWidthVw = 30,
		maxWidthVw = 90,
		viewportPaddingVw = 3,
		chromeHeightVh = 10,
		desktopQuery = "(min-width: 900px)"
	} = options;

	return (element) => {
		let isResizable = false;
		let activeEdge: Edge = null;
		let dragStartX = 0;
		let dragStartY = 0;
		let dragStartWidth = 0;

		const isFullscreen = () => document.fullscreenElement !== null;

		/** Convert vw percentage to pixels */
		const vwToPx = (vw: number): number => (vw / 100) * window.innerWidth;

		/** Convert vh percentage to pixels */
		const vhToPx = (vh: number): number => (vh / 100) * window.innerHeight;

		const computeMaxWidth = (): number => {
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			// Max from viewport width constraint
			const maxFromWidth = vw * (1 - (viewportPaddingVw * 2) / 100);

			// Max from viewport height constraint (accounting for aspect ratio)
			const availableHeight = vh * (1 - (viewportPaddingVw * 2) / 100 - chromeHeightVh / 100);
			const maxFromHeight = availableHeight * aspectRatio;

			// Clamp between min/max vw settings and viewport constraints
			const minPx = vwToPx(minWidthVw);
			const maxPx = vwToPx(maxWidthVw);

			return Math.min(maxPx, maxFromWidth, maxFromHeight, Math.max(minPx, maxFromWidth));
		};

		const clampWidth = (value: number): number => {
			const minPx = vwToPx(minWidthVw);
			return Math.min(Math.max(value, minPx), computeMaxWidth());
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

			const nearTop = y < EDGE_THRESHOLD;
			const nearBottom = y > rect.height - EDGE_THRESHOLD;
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
						newWidth = dragStartWidth + deltaY * aspectRatio;
						break;
					case "top":
						newWidth = dragStartWidth - deltaY * aspectRatio;
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
		};

		const handlePointerLeave = () => {
			if (!activeEdge) {
				updateCursor(null);
			}
		};

		// Media query handling
		const mediaQuery = window.matchMedia(desktopQuery);

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
