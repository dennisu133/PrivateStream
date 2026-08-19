<script lang="ts">
	import { onMount } from "svelte";
	import { Volume, Volume1, Volume2, VolumeX } from "@lucide/svelte";
	import Button from "./Button.svelte";

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

	const dispatchShow = () => {
		containerEl?.dispatchEvent(new CustomEvent("autohide:show", { bubbles: true }));
	};

	const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

	const applyVideoState = () => {
		if (!video) return;
		video.volume = volume;
		video.muted = isMuted;
	};

	const persistState = () => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					volume,
					isMuted,
					lastVolume: lastNonZeroVolume
				})
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
			if (isMuted) isMuted = false;
			if (wasMuted) {
				try {
					video?.play?.();
				} catch {}
			}
		}
		applyVideoState();
		persistState();
	};

	const toggleMute = () => {
		if (isMuted) {
			const restored = lastNonZeroVolume > 0 ? lastNonZeroVolume : DEFAULT_VOLUME;
			setVolumeNormalized(restored);
		} else {
			if (volume > 0) lastNonZeroVolume = volume;
			isMuted = true;
			applyVideoState();
			persistState();
		}
		dispatchShow();
	};

	const adjustVolume = (delta: number) => {
		setVolumeNormalized(volume + delta);
		dispatchShow();
	};

	const handleInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement | null;
		if (!target) return;
		const next = parseFloat(target.value);
		if (!Number.isNaN(next)) {
			setVolumeNormalized(next);
			dispatchShow();
		}
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
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as {
				volume?: number;
				isMuted?: boolean;
				lastVolume?: number;
			};
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
			// Start muted so autoplay is allowed.
			isMuted = true;
		} catch (error) {
			console.warn("Failed to restore player volume", error);
		}
	};

	onMount(() => {
		restoreState();
		applyVideoState();
	});
</script>

<svelte:window onkeydown={handleKeydown} onwheel={handleWheel} />

<div
	class="flex items-center gap-2.5"
	bind:this={containerEl}
	role="group"
	aria-label="Volume controls"
>
	<Button
		label={isMuted ? "Unmute" : "Mute"}
		title={(isMuted ? "Unmute" : "Mute") + " (m)"}
		onclick={toggleMute}
	>
		{#if isMuted}
			<VolumeX size={24} strokeWidth={2} aria-hidden="true" />
		{:else if volume < 0.33}
			<Volume size={24} strokeWidth={2} aria-hidden="true" />
		{:else if volume < 0.66}
			<Volume1 size={24} strokeWidth={2} aria-hidden="true" />
		{:else}
			<Volume2 size={24} strokeWidth={2} aria-hidden="true" />
		{/if}
	</Button>

	<!-- h-8 matches the adjacent Button, so the focus ring is the same box. The
	     negative margin cancels the padding, leaving the row spacing unchanged. -->
	<span class="volume-box -mx-1.5 inline-flex h-8 items-center rounded-sm px-1.5">
		<input
			class="w-30"
			type="range"
			min="0"
			max="1"
			step={STEP}
			value={volume}
			oninput={handleInput}
			title="Adjust volume (↑/↓/scroll)"
			aria-label="Volume"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={volumePercent}
			aria-valuetext={volumeText}
		/>
	</span>
</div>

<style>
	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		height: 3px;
		background: color-mix(in oklch, var(--color-theater-gold) 14%, transparent);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	input[type="range"]:hover {
		background: color-mix(in oklch, var(--color-theater-gold) 30%, transparent);
	}

	/* The ring lives on the wrapper: an outline on the 3px input inherits the
	   track's radius and renders as a pill. rounded-sm matches the Buttons. */
	.volume-box:has(input:focus-visible) {
		outline: 1px solid color-mix(in oklch, var(--color-theater-gold) 40%, transparent);
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
		background: color-mix(in oklch, var(--color-theater-gold) 14%, transparent);
		border-radius: 2px;
		transition: background 0.2s ease;
	}

	input[type="range"]:hover::-moz-range-track {
		background: color-mix(in oklch, var(--color-theater-gold) 30%, transparent);
	}
</style>
