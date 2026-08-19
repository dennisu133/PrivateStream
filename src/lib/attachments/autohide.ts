import type { Attachment } from "svelte/attachments";

const HIDE_DELAY_MS = 2200;

/**
 * Toggles `data-visible` on the element after pointer or focus activity in its
 * parent. Controls may dispatch `autohide:hold`, `autohide:release`, or
 * `autohide:show`; those bubble, so the parent listener catches them whether they
 * are raised on the parent itself or anywhere inside the controls.
 */
export function autohide(): Attachment<HTMLElement> {
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
				hideTimer = null;
				setVisible(false);
			}, HIDE_DELAY_MS);
		};

		const show = () => {
			setVisible(true);
			scheduleHide();
		};

		// Counted, not flagged: focus and the reaction menu hold independently, and
		// releasing one must not cancel the other.
		const hold = () => {
			holdDepth += 1;
			setVisible(true);
			clearHideTimer();
		};

		const release = () => {
			holdDepth = Math.max(0, holdDepth - 1);
			if (holdDepth === 0) scheduleHide();
		};

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

		const monitor = element.parentElement;
		const pointerEvents = ["pointermove", "pointerdown", "wheel"] as const;

		if (monitor) {
			pointerEvents.forEach((event) => {
				monitor.addEventListener(event, show, { passive: true });
			});
			monitor.addEventListener("pointerleave", handlePointerLeave);
			monitor.addEventListener("autohide:hold", hold);
			monitor.addEventListener("autohide:release", release);
			monitor.addEventListener("autohide:show", show);
		}

		element.addEventListener("pointerenter", handleControlsEnter);
		element.addEventListener("pointerleave", handleControlsLeave);
		// The bar stays in the tab order while transparent, so tabbing into it fires
		// focusin and pins it open. Without this it is unreachable without a pointer.
		element.addEventListener("focusin", hold);
		element.addEventListener("focusout", release);

		setVisible(true);
		scheduleHide();

		return () => {
			clearHideTimer();

			if (monitor) {
				pointerEvents.forEach((event) => {
					monitor.removeEventListener(event, show);
				});
				monitor.removeEventListener("pointerleave", handlePointerLeave);
				monitor.removeEventListener("autohide:hold", hold);
				monitor.removeEventListener("autohide:release", release);
				monitor.removeEventListener("autohide:show", show);
			}

			element.removeEventListener("pointerenter", handleControlsEnter);
			element.removeEventListener("pointerleave", handleControlsLeave);
			element.removeEventListener("focusin", hold);
			element.removeEventListener("focusout", release);
		};
	};
}
