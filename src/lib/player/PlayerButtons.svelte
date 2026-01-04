<script lang="ts">
	import ReactionButton from "./reactions/ReactionButton.svelte";
	import VolumeControls from "./controls/VolumeControls.svelte";
	import FullscreenToggle from "./controls/FullscreenToggle.svelte";

	const HIDE_DELAY = 2200;

	let {
		player = null,
		frame = null,
		video = null,
		enableFunFeatures = true,
		playerSize = null
	}: {
		player?: HTMLElement | null;
		frame?: HTMLElement | null;
		video?: HTMLVideoElement | null;
		enableFunFeatures?: boolean;
		playerSize?: { width: number; height: number } | null;
	} = $props();

	let rootEl = $state<HTMLDivElement | null>(null);
	let controlsVisible = $state(true);
	let pointerInside = $state(false);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let holdDepth = 0;
	const volumeKeyLocks = new Set<symbol>();
	let volumeKeysSuspended = $state(false);

	const refreshVolumeSuspended = () => {
		volumeKeysSuspended = volumeKeyLocks.size > 0;
	};

	const suspendVolumeKeys = () => {
		const token = Symbol("volume-lock");
		volumeKeyLocks.add(token);
		refreshVolumeSuspended();
		return () => {
			volumeKeyLocks.delete(token);
			refreshVolumeSuspended();
		};
	};

	const clearHideTimer = () => {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	};

	const scheduleHide = () => {
		if (pointerInside || holdDepth > 0) return;
		clearHideTimer();
		hideTimer = setTimeout(() => {
			if (!pointerInside && holdDepth === 0) {
				controlsVisible = false;
			}
			hideTimer = null;
		}, HIDE_DELAY);
	};

	const showControlsTemporarily = () => {
		controlsVisible = true;
		scheduleHide();
	};

	const onControlsEnter = () => {
		pointerInside = true;
		controlsVisible = true;
		clearHideTimer();
	};

	const onControlsLeave = () => {
		pointerInside = false;
		scheduleHide();
	};

	const holdControls = () => {
		holdDepth += 1;
		controlsVisible = true;
		clearHideTimer();
	};

	const releaseControls = () => {
		holdDepth = Math.max(0, holdDepth - 1);
		if (holdDepth === 0) scheduleHide();
	};

	const attachPointerSensors = (target: HTMLElement) => {
		const pointerEvents = ["pointermove", "pointerdown", "wheel"];
		const onPointer = () => showControlsTemporarily();
		pointerEvents.forEach((event) => target.addEventListener(event, onPointer, { passive: true }));
		const onLeave = () => scheduleHide();
		target.addEventListener("pointerleave", onLeave);
		showControlsTemporarily();
		return () => {
			pointerEvents.forEach((event) => target.removeEventListener(event, onPointer));
			target.removeEventListener("pointerleave", onLeave);
		};
	};

	const onReactionMenuOpen = () => holdControls();
	const onReactionMenuClose = () => releaseControls();
</script>

<div
	bind:this={rootEl}
	data-visible={controlsVisible}
	{@attach (node) => {
		const target = frame ?? (node.parentElement as HTMLElement | null) ?? player;
		if (!target) return;
		return attachPointerSensors(target);
	}}
>
	<div
		class="pointer-events-auto absolute right-2.5 bottom-2.5 isolate z-10 flex items-center gap-2.5 rounded-lg bg-black/35 px-2 py-1.5 backdrop-blur-[2px] transition-all duration-200 ease-in-out
			{controlsVisible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1.5 opacity-0'}"
		onpointerenter={onControlsEnter}
		onpointerleave={onControlsLeave}
	>
		{#if enableFunFeatures}
			<ReactionButton
				{player}
				{frame}
				{playerSize}
				{suspendVolumeKeys}
				onRevealControls={showControlsTemporarily}
				onMenuOpen={() => {
					onReactionMenuOpen();
					showControlsTemporarily();
				}}
				onMenuClose={() => {
					onReactionMenuClose();
					showControlsTemporarily();
				}}
			/>
		{/if}

		<VolumeControls {video} onShowControls={showControlsTemporarily} {volumeKeysSuspended} />

		<FullscreenToggle target={frame ?? video ?? player} onShowControls={showControlsTemporarily} />
	</div>
</div>
