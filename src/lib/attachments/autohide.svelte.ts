import type { Attachment } from "svelte/attachments";

export type AutohideOptions = {
	/** Delay in milliseconds before hiding after inactivity */
	delay?: number;
	/** Selector for the element to monitor for pointer events (defaults to parent element) */
	monitorSelector?: string;
	/** Whether autohide is initially enabled */
	enabled?: boolean;
};

/**
 * Creates an autohide attachment that shows/hides an element based on pointer activity.
 *
 * The attachment sets the following data attributes on the element:
 * - `data-visible`: "true" when the element should be visible, "false" when hidden
 *
 * It also provides a way for child elements to hold visibility by dispatching custom events:
 * - `autohide:hold` - prevents hiding until released
 * - `autohide:release` - allows hiding again
 * - `autohide:show` - shows the element temporarily
 *
 * @example
 * ```svelte
 * <div {@attach autohide({ delay: 2000 })}>
 *   Controls that auto-hide
 * </div>
 * ```
 */
export function autohide(options: AutohideOptions = {}): Attachment<HTMLElement> {
	const { delay = 2200, monitorSelector, enabled = true } = options;

	return (element) => {
		if (!enabled) {
			element.setAttribute("data-visible", "true");
			return;
		}

		let isVisible = true;
		let pointerInside = false;
		let holdDepth = 0;
		let hideTimer: ReturnType<typeof setTimeout> | null = null;

		const setVisible = (visible: boolean) => {
			isVisible = visible;
			element.setAttribute("data-visible", String(visible));
		};

		const clearHideTimer = () => {
			if (hideTimer !== null) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
		};

		const scheduleHide = () => {
			if (pointerInside || holdDepth > 0) return;
			clearHideTimer();
			hideTimer = setTimeout(() => {
				if (!pointerInside && holdDepth === 0) {
					setVisible(false);
				}
				hideTimer = null;
			}, delay);
		};

		const show = () => {
			setVisible(true);
			scheduleHide();
		};

		const hold = () => {
			holdDepth += 1;
			setVisible(true);
			clearHideTimer();
		};

		const release = () => {
			holdDepth = Math.max(0, holdDepth - 1);
			if (holdDepth === 0) {
				scheduleHide();
			}
		};

		// Pointer event handlers for the monitored element
		const handlePointerActivity = () => show();
		const handlePointerLeave = () => scheduleHide();

		// Pointer event handlers for the element itself (the controls)
		const handleControlsEnter = () => {
			pointerInside = true;
			setVisible(true);
			clearHideTimer();
		};

		const handleControlsLeave = () => {
			pointerInside = false;
			scheduleHide();
		};

		// Custom event handlers for hold/release/show
		const handleHold = (e: Event) => {
			e.stopPropagation();
			hold();
		};

		const handleRelease = (e: Event) => {
			e.stopPropagation();
			release();
		};

		const handleShow = (e: Event) => {
			e.stopPropagation();
			show();
		};

		// Find the element to monitor for pointer events
		const getMonitorTarget = (): HTMLElement | null => {
			if (monitorSelector) {
				return document.querySelector(monitorSelector);
			}
			return element.parentElement;
		};

		const monitorTarget = getMonitorTarget();
		const pointerEvents = ["pointermove", "pointerdown", "wheel"] as const;

		// Setup monitor target listeners
		if (monitorTarget) {
			pointerEvents.forEach((event) => {
				monitorTarget.addEventListener(event, handlePointerActivity, { passive: true });
			});
			monitorTarget.addEventListener("pointerleave", handlePointerLeave);
		}

		// Setup element listeners for hover state
		element.addEventListener("pointerenter", handleControlsEnter);
		element.addEventListener("pointerleave", handleControlsLeave);

		// Setup custom event listeners for hold/release/show
		element.addEventListener("autohide:hold", handleHold);
		element.addEventListener("autohide:release", handleRelease);
		element.addEventListener("autohide:show", handleShow);

		// Initialize visible state
		setVisible(true);
		scheduleHide();

		// Cleanup
		return () => {
			clearHideTimer();

			if (monitorTarget) {
				pointerEvents.forEach((event) => {
					monitorTarget.removeEventListener(event, handlePointerActivity);
				});
				monitorTarget.removeEventListener("pointerleave", handlePointerLeave);
			}

			element.removeEventListener("pointerenter", handleControlsEnter);
			element.removeEventListener("pointerleave", handleControlsLeave);
			element.removeEventListener("autohide:hold", handleHold);
			element.removeEventListener("autohide:release", handleRelease);
			element.removeEventListener("autohide:show", handleShow);
		};
	};
}
