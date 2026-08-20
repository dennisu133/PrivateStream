<script lang="ts">
	import { browser } from "$app/environment";
	import { Volume, Volume1, Volume2, VolumeX } from "@lucide/svelte";
	import Button from "./Button.svelte";
	import { dispatchAutohide } from "$lib/attachments/autohide";

	const STEP = 0.05;
	const SCROLL_STEP = 0.02;
	const DEFAULT_VOLUME = 0.5;
	const STORAGE_KEY = "player.volume";

	let {
		video = null,
		disableGlobalInput = false
	}: {
		video?: HTMLVideoElement | null;
		disableGlobalInput?: boolean;
	} = $props();

	let volume = $state(0);
	let isMuted = $state(true);
	let lastNonZeroVolume = $state(DEFAULT_VOLUME);
	let containerEl = $state<HTMLElement | null>(null);

	const volumePercent = $derived(Math.round(volume * 100));
	const volumeText = $derived(isMuted ? "Muted" : `${volumePercent}%`);
	const VolumeIcon = $derived(
		isMuted ? VolumeX : volume < 0.33 ? Volume : volume < 0.66 ? Volume1 : Volume2
	);

	const dispatchShow = () => dispatchAutohide(containerEl, "autohide:show");

	const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

	// Browsers refuse a programmatic unmute until the document has been activated, and
	// Firefox pauses the element when one is attempted. Wheel events never activate a
	// document, so scrolling before any click or keypress lands exactly there.
	const canUnmute = () => navigator.userActivation?.hasBeenActive ?? true;

	// Also runs when the video element itself arrives, so a restored volume is not lost.
	$effect(() => {
		if (!video) return;
		video.volume = volume;
		video.muted = isMuted;
	});

	// isMuted is deliberately not persisted: browsers only allow a programmatic unmute
	// with user activation, so an honoured preference would be refused and re-muted.
	const persistState = () => {
		try {
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ volume, lastVolume: lastNonZeroVolume })
			);
		} catch (error) {
			console.warn("Failed to persist player volume", error);
		}
	};

	const setVolumeNormalized = (next: number) => {
		const clamped = clamp01(next);
		const wasMuted = isMuted;
		volume = clamped;
		if (clamped === 0) {
			isMuted = true;
		} else {
			lastNonZeroVolume = clamped;
			// Without activation the level is kept but the video stays muted, so the next
			// click or keypress unmutes it instead of the browser pausing playback now.
			if (canUnmute()) {
				isMuted = false;
				// A muted autoplay start stays paused in some browsers until asked directly.
				if (wasMuted) void video?.play().catch(() => {});
			}
		}
		persistState();
	};

	const toggleMute = () => {
		if (isMuted) {
			setVolumeNormalized(lastNonZeroVolume || DEFAULT_VOLUME);
		} else {
			if (volume > 0) lastNonZeroVolume = volume;
			isMuted = true;
			persistState();
		}
		dispatchShow();
	};

	const adjustVolume = (delta: number) => {
		setVolumeNormalized(volume + delta);
		dispatchShow();
	};

	const handleInput = (event: Event & { currentTarget: HTMLInputElement }) => {
		setVolumeNormalized(event.currentTarget.valueAsNumber);
		dispatchShow();
	};

	const handleWheel = (event: WheelEvent) => {
		if (disableGlobalInput) return;
		const delta = event.deltaY < 0 ? SCROLL_STEP : -SCROLL_STEP;
		adjustVolume(delta);
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (disableGlobalInput) return;
		// Leave modified combos to the browser and OS: Ctrl+Up is Mission Control,
		// Cmd+M minimises, and neither should nudge the volume.
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		const targetEl = event.target as HTMLElement | null;
		if (targetEl?.matches("input, textarea, select, [contenteditable]")) {
			return;
		}

		switch (event.key) {
			case "ArrowUp":
				event.preventDefault();
				adjustVolume(STEP);
				break;
			case "ArrowDown":
				event.preventDefault();
				adjustVolume(-STEP);
				break;
			case "m":
			case "M":
				event.preventDefault();
				toggleMute();
				break;
		}
	};

	const restoreState = () => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as { volume?: number; lastVolume?: number };
			if (typeof saved.volume === "number") {
				volume = clamp01(saved.volume);
			}
			if (typeof saved.lastVolume === "number") {
				lastNonZeroVolume = clamp01(saved.lastVolume);
			} else if (volume > 0) {
				lastNonZeroVolume = volume;
			} else {
				lastNonZeroVolume = DEFAULT_VOLUME;
			}
		} catch (error) {
			console.warn("Failed to restore player volume", error);
		}
	};

	// Synchronous on purpose: restoring during init means the hydrated paint already
	// shows the stored volume, instead of flashing defaults until onMount runs.
	if (browser) restoreState();
</script>

<svelte:window onkeydown={handleKeydown} onwheel={handleWheel} />

<div
	class="flex items-center gap-2.5"
	data-restoring={browser ? undefined : ""}
	bind:this={containerEl}
	role="group"
	aria-label="Volume controls"
>
	<Button
		label={isMuted ? "Unmute" : "Mute"}
		title={(isMuted ? "Unmute" : "Mute") + " (m)"}
		onclick={toggleMute}
	>
		<VolumeIcon size={24} aria-hidden="true" />
	</Button>

	<!-- h-8 matches the adjacent Button, so the focus ring is the same box. The
	     negative margin cancels the padding, leaving the row spacing unchanged. -->
	<span class="volume-box -mx-1.5 inline-flex h-8 items-center rounded-sm px-1.5">
		<input
			class="w-30"
			style:--volume-fill="{volumePercent}%"
			data-restoring={browser ? undefined : ""}
			type="range"
			min="0"
			max="1"
			step={STEP}
			value={volume}
			oninput={handleInput}
			title="Adjust volume (↑/↓/scroll)"
			aria-label="Volume"
			aria-valuetext={volumeText}
		/>
	</span>
</div>

<style>
	input[type="range"] {
		--track-fill: var(--color-theater-gold-dim);
		--track-empty: color-mix(in oklch, var(--color-theater-gold) 14%, transparent);
		/* Filled up to the thumb, dim past it, and hover brightens both halves. The
		   gradient is defined once so both engines paint from the same value. */
		--track: linear-gradient(
			to right,
			var(--track-fill) var(--volume-fill, 0%),
			var(--track-empty) var(--volume-fill, 0%)
		);

		-webkit-appearance: none;
		appearance: none;
		height: 3px;
		background: var(--track);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	input[type="range"]:hover {
		--track-fill: var(--color-theater-gold);
		--track-empty: color-mix(in oklch, var(--color-theater-gold) 30%, transparent);
	}

	/* The ring lives on the wrapper: an outline on the 3px input inherits the
	   track's radius and renders as a pill. rounded-sm matches the Buttons. */
	.volume-box:has(input:focus-visible) {
		outline: 1px solid color-mix(in oklch, var(--color-theater-gold) 40%, transparent);
	}

	/* Before the stored value is in, the icon would show the default muted state, so it
	   hides along with the thumb. :global because the svg is rendered by the icon
	   component and carries no scope class. */
	div[data-restoring] :global(svg) {
		opacity: 0;
	}

	/* Before the stored value is in, volume is 0: the fill has no width and the track
	   reads as a neutral placeholder. The thumb would sit at 0 and visibly jump, so it
	   waits and arrives with the fill. */
	input[data-restoring]::-webkit-slider-thumb {
		opacity: 0;
	}

	/* Separate rule on purpose: an unknown selector in a group drops the whole rule,
	   and each engine only knows its own thumb pseudo-element. */
	input[data-restoring]::-moz-range-thumb {
		opacity: 0;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		/* Keep the thumb opaque so the track does not show through. */
		background: var(--color-theater-muted);
		cursor: pointer;
		transition:
			background 0.2s ease,
			transform 0.15s ease;
	}

	input[type="range"]:hover::-webkit-slider-thumb {
		background: var(--color-theater-gold);
		transform: scale(1.2);
	}

	input[type="range"]::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-theater-muted);
		cursor: pointer;
		border: none;
		transition: background 0.2s ease;
	}

	input[type="range"]:hover::-moz-range-thumb {
		background: var(--color-theater-gold);
	}

	input[type="range"]::-moz-range-track {
		height: 3px;
		background: var(--track);
		border-radius: 2px;
		transition: background 0.2s ease;
	}
</style>
