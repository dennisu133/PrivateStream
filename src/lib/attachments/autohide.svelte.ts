import type { Attachment } from "svelte/attachments";

export type AutohideOptions = {
	/** Element whose pointer activity keeps controls visible. Defaults to the parent. */
	monitorSelector?: string;
};

const HIDE_DELAY_MS = 2200;

/**
 * Toggles `data-visible` after pointer activity. Child controls can dispatch
 * `autohide:hold`, `autohide:release`, or `autohide:show`.
 */
export function autohide(options: AutohideOptions = {}): Attachment<HTMLElement> {
	const { monitorSelector } = options;

	return (element) => {
		let pointerInside = false;
		let holdDepth = 0;
		let hideTimer: ReturnType<typeof setTimeout> | null = null;

		const setVisible = (visible: boolean) => {
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
			}, HIDE_DELAY_MS);
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

		const handlePointerActivity = () => show();
		const handlePointerLeave = () => scheduleHide();

		const handleControlsEnter = () => {
			pointerInside = true;
			setVisible(true);
			clearHideTimer();
		};

		const handleControlsLeave = () => {
			pointerInside = false;
			scheduleHide();
		};

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

		const monitorTarget = monitorSelector
			? document.querySelector<HTMLElement>(monitorSelector)
			: element.parentElement;
		const pointerEvents = ["pointermove", "pointerdown", "wheel"] as const;

		if (monitorTarget) {
			pointerEvents.forEach((event) => {
				monitorTarget.addEventListener(event, handlePointerActivity, { passive: true });
			});
			monitorTarget.addEventListener("pointerleave", handlePointerLeave);
			// Events sent to the monitor do not bubble down to the controls.
			monitorTarget.addEventListener("autohide:hold", handleHold);
			monitorTarget.addEventListener("autohide:release", handleRelease);
			monitorTarget.addEventListener("autohide:show", handleShow);
		}

		element.addEventListener("pointerenter", handleControlsEnter);
		element.addEventListener("pointerleave", handleControlsLeave);

		element.addEventListener("autohide:hold", handleHold);
		element.addEventListener("autohide:release", handleRelease);
		element.addEventListener("autohide:show", handleShow);

		setVisible(true);
		scheduleHide();

		return () => {
			clearHideTimer();

			if (monitorTarget) {
				pointerEvents.forEach((event) => {
					monitorTarget.removeEventListener(event, handlePointerActivity);
				});
				monitorTarget.removeEventListener("pointerleave", handlePointerLeave);
				monitorTarget.removeEventListener("autohide:hold", handleHold);
				monitorTarget.removeEventListener("autohide:release", handleRelease);
				monitorTarget.removeEventListener("autohide:show", handleShow);
			}

			element.removeEventListener("pointerenter", handleControlsEnter);
			element.removeEventListener("pointerleave", handleControlsLeave);
			element.removeEventListener("autohide:hold", handleHold);
			element.removeEventListener("autohide:release", handleRelease);
			element.removeEventListener("autohide:show", handleShow);
		};
	};
}
