<script lang="ts">
	import { onMount } from "svelte";
	import { Volume, Volume1, Volume2, VolumeX } from "@lucide/svelte";
	import Button from "./Button.svelte";

	const STEP = 0.05;
	const SCROLL_STEP = 0.02;
	const DEFAULT_VOLUME = 0.5;

	let {
		video = null,
		storageKey = "player.volume"
	}: {
		video?: HTMLVideoElement | null;
		storageKey?: string;
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
				storageKey,
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
		// Scroll up = increase volume, scroll down = decrease
		const delta = event.deltaY < 0 ? SCROLL_STEP : -SCROLL_STEP;
		adjustVolume(delta);
	};

	const handleKeydown = (event: KeyboardEvent) => {
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
			const raw = window.localStorage.getItem(storageKey);
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
			// Always start muted to satisfy autoplay policies
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
		pressed={isMuted}
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

	<input
		class="volume-slider w-30 accent-white"
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
</div>
