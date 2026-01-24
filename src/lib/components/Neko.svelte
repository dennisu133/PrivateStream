<script lang="ts">
	import { onMount } from "svelte";

	// --- Sprite imports (Vite asset pipeline) ---
	import sprAwake from "$lib/assets/neko/awake.png";
	import sprUp1 from "$lib/assets/neko/up1.png";
	import sprUp2 from "$lib/assets/neko/up2.png";
	import sprUpright1 from "$lib/assets/neko/upright1.png";
	import sprUpright2 from "$lib/assets/neko/upright2.png";
	import sprRight1 from "$lib/assets/neko/right1.png";
	import sprRight2 from "$lib/assets/neko/right2.png";
	import sprDownright1 from "$lib/assets/neko/downright1.png";
	import sprDownright2 from "$lib/assets/neko/downright2.png";
	import sprDown1 from "$lib/assets/neko/down1.png";
	import sprDown2 from "$lib/assets/neko/down2.png";
	import sprDownleft1 from "$lib/assets/neko/downleft1.png";
	import sprDownleft2 from "$lib/assets/neko/downleft2.png";
	import sprLeft1 from "$lib/assets/neko/left1.png";
	import sprLeft2 from "$lib/assets/neko/left2.png";
	import sprUpleft1 from "$lib/assets/neko/upleft1.png";
	import sprUpleft2 from "$lib/assets/neko/upleft2.png";
	import sprUpclaw1 from "$lib/assets/neko/upclaw1.png";
	import sprUpclaw2 from "$lib/assets/neko/upclaw2.png";
	import sprRightclaw1 from "$lib/assets/neko/rightclaw1.png";
	import sprRightclaw2 from "$lib/assets/neko/rightclaw2.png";
	import sprLeftclaw1 from "$lib/assets/neko/leftclaw1.png";
	import sprLeftclaw2 from "$lib/assets/neko/leftclaw2.png";
	import sprDownclaw1 from "$lib/assets/neko/downclaw1.png";
	import sprDownclaw2 from "$lib/assets/neko/downclaw2.png";
	import sprWash2 from "$lib/assets/neko/wash2.png";
	import sprScratch1 from "$lib/assets/neko/scratch1.png";
	import sprScratch2 from "$lib/assets/neko/scratch2.png";
	import sprYawn2 from "$lib/assets/neko/yawn2.png";
	import sprYawn3 from "$lib/assets/neko/yawn3.png";
	import sprSleep1 from "$lib/assets/neko/sleep1.png";
	import sprSleep2 from "$lib/assets/neko/sleep2.png";

	// --- Configuration ---
	const SPEED_MIN = 8; // minimum speed (close to cursor)
	const SPEED_MAX = 24; // maximum speed (far from cursor)
	const SPEED_RAMP_DIST = 200; // distance at which max speed is reached
	const IDLE_SPACE = 6;
	const LOGIC_INTERVAL = 125; // ms between logic ticks (~8 fps)
	const SPRITE_SIZE = 32;
	const HOME_X = 20;
	const HOME_Y = 20;
	const STORAGE_KEY = "neko-chasing";

	// --- Proximity / fidget / petting config ---
	const PROXIMITY_DIST = 80; // px - cursor distance to trigger startle
	const PROXIMITY_AWAKE_TICKS = 8; // how long to stay awake when startled
	const FIDGET_CHANCE = 0.001; // chance per tick to fidget during sleep (~once per 2 min)
	const FIDGET_DURATION = 6; // ticks for a fidget animation
	const PET_DURATION = 12; // ticks for the petting (wash) animation

	// --- State enum (matching original Neko98) ---
	const State = {
		STOP: 0,
		WASH: 1,
		SCRATCH: 2,
		YAWN: 3,
		SLEEP: 4,
		AWAKE: 5,
		U_MOVE: 6,
		D_MOVE: 7,
		L_MOVE: 8,
		R_MOVE: 9,
		UL_MOVE: 10,
		UR_MOVE: 11,
		DL_MOVE: 12,
		DR_MOVE: 13,
		U_CLAW: 14,
		D_CLAW: 15,
		L_CLAW: 16,
		R_CLAW: 17
	} as const;

	type NekoState = (typeof State)[keyof typeof State];

	// --- Timing constants (in logic ticks) ---
	const STOP_TIME = 4;
	const WASH_TIME = 10;
	const SCRATCH_TIME = 4;
	const YAWN_TIME = 3;
	const AWAKE_TIME = 3;
	const CLAW_TIME = 10;

	// --- Trig constants for direction calculation ---
	const SIN_PI_PER_8 = 0.3826834323651;
	const SIN_PI_PER_8_TIMES_3 = 0.9238795325113;

	// --- Sprite frames in order (index 0-31) ---
	const SPRITES: string[] = [
		sprAwake, // 0
		sprUp1, // 1
		sprUp2, // 2
		sprUpright1, // 3
		sprUpright2, // 4
		sprRight1, // 5
		sprRight2, // 6
		sprDownright1, // 7
		sprDownright2, // 8
		sprDown1, // 9
		sprDown2, // 10
		sprDownleft1, // 11
		sprDownleft2, // 12
		sprLeft1, // 13
		sprLeft2, // 14
		sprUpleft1, // 15
		sprUpleft2, // 16
		sprUpclaw1, // 17
		sprUpclaw2, // 18
		sprRightclaw1, // 19
		sprRightclaw2, // 20
		sprLeftclaw1, // 21
		sprLeftclaw2, // 22
		sprDownclaw1, // 23
		sprDownclaw2, // 24
		sprWash2, // 25
		sprScratch1, // 26
		sprScratch2, // 27
		sprYawn2, // 28 - used as STOP frame too
		sprYawn3, // 29
		sprSleep1, // 30
		sprSleep2 // 31
	];

	// --- Animation table: [state] = [frame0_index, frame1_index] ---
	const ANIMATION: [number, number][] = [];
	ANIMATION[State.STOP] = [28, 28];
	ANIMATION[State.WASH] = [25, 28];
	ANIMATION[State.SCRATCH] = [26, 27];
	ANIMATION[State.YAWN] = [29, 29];
	ANIMATION[State.SLEEP] = [30, 31];
	ANIMATION[State.AWAKE] = [0, 0];
	ANIMATION[State.U_MOVE] = [1, 2];
	ANIMATION[State.D_MOVE] = [9, 10];
	ANIMATION[State.L_MOVE] = [13, 14];
	ANIMATION[State.R_MOVE] = [5, 6];
	ANIMATION[State.UL_MOVE] = [15, 16];
	ANIMATION[State.UR_MOVE] = [3, 4];
	ANIMATION[State.DL_MOVE] = [11, 12];
	ANIMATION[State.DR_MOVE] = [7, 8];
	ANIMATION[State.U_CLAW] = [17, 18];
	ANIMATION[State.D_CLAW] = [23, 24];
	ANIMATION[State.L_CLAW] = [21, 22];
	ANIMATION[State.R_CLAW] = [19, 20];

	// --- Reactive state (Svelte 5 runes) ---
	let renderX = $state(HOME_X);
	let renderY = $state(HOME_Y);
	let currentFrame = $state(0);
	let chasing = $state(true);

	// --- Internal logic state ---
	let logicX = HOME_X;
	let logicY = HOME_Y;
	let prevLogicX = HOME_X;
	let prevLogicY = HOME_Y;
	let currentState: NekoState = State.STOP;
	let dx = 0;
	let dy = 0;
	let toX = 0;
	let toY = 0;
	let oldToX = 0;
	let oldToY = 0;
	let tickCount = 0;
	let stateCount = 0;
	let mouseX = HOME_X;
	let mouseY = HOME_Y;
	let lastLogicTime = 0;
	let returningHome = false;

	// --- Idle behavior state ---
	let fidgeting = false;
	let fidgetTicks = 0;
	let proximityAwake = false;
	let proximityTicks = 0;
	let beingPetted = false;
	let petTicks = 0;

	// --- Derived ---
	let spriteSrc = $derived(SPRITES[currentFrame]);

	// --- Helper functions ---
	function moveStart(): boolean {
		return !(
			oldToX >= toX - IDLE_SPACE &&
			oldToX <= toX + IDLE_SPACE &&
			oldToY >= toY - IDLE_SPACE &&
			oldToY <= toY + IDLE_SPACE
		);
	}

	function setNekoState(state: NekoState) {
		tickCount = 0;
		stateCount = 0;
		currentState = state;
	}

	function getFrameIndex(): number {
		const anim = ANIMATION[currentState];
		if (!anim) return 0;
		if (currentState !== State.SLEEP) {
			return anim[tickCount & 1];
		} else {
			return anim[(tickCount >> 2) & 1];
		}
	}

	function calcDirection() {
		let newState: NekoState;

		if (dx === 0 && dy === 0) {
			newState = State.STOP;
		} else {
			const largeX = dx;
			const largeY = -dy;
			const length = Math.sqrt(largeX * largeX + largeY * largeY);
			const sinTheta = largeY / length;

			if (dx > 0) {
				if (sinTheta > SIN_PI_PER_8_TIMES_3) newState = State.U_MOVE;
				else if (sinTheta > SIN_PI_PER_8) newState = State.UR_MOVE;
				else if (sinTheta > -SIN_PI_PER_8) newState = State.R_MOVE;
				else if (sinTheta > -SIN_PI_PER_8_TIMES_3) newState = State.DR_MOVE;
				else newState = State.D_MOVE;
			} else {
				if (sinTheta > SIN_PI_PER_8_TIMES_3) newState = State.U_MOVE;
				else if (sinTheta > SIN_PI_PER_8) newState = State.UL_MOVE;
				else if (sinTheta > -SIN_PI_PER_8) newState = State.L_MOVE;
				else if (sinTheta > -SIN_PI_PER_8_TIMES_3) newState = State.DL_MOVE;
				else newState = State.D_MOVE;
			}
		}

		if (currentState !== newState) setNekoState(newState);
	}

	function getSpeed(): number {
		// Variable speed: accelerate when further from cursor
		const distX = mouseX - logicX - SPRITE_SIZE / 2;
		const distY = mouseY - logicY - SPRITE_SIZE / 2;
		const dist = Math.sqrt(distX * distX + distY * distY);
		const t = Math.min(dist / SPEED_RAMP_DIST, 1);
		return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * t;
	}

	function cursorDistToNeko(): number {
		const cx = logicX + SPRITE_SIZE / 2;
		const cy = logicY + SPRITE_SIZE / 2;
		const ddx = mouseX - cx;
		const ddy = mouseY - cy;
		return Math.sqrt(ddx * ddx + ddy * ddy);
	}

	function logicTick() {
		const atHome = !chasing && !returningHome;

		// --- Petting animation (double-click triggered) ---
		if (beingPetted) {
			petTicks++;
			tickCount++;
			currentState = State.WASH;
			currentFrame = getFrameIndex();
			if (petTicks >= PET_DURATION) {
				beingPetted = false;
				petTicks = 0;
				setNekoState(State.STOP);
				currentFrame = getFrameIndex();
			}
			return;
		}

		// --- Idle at home: proximity reaction + fidgets ---
		if (atHome) {
			tickCount = (tickCount + 1) % 9999;

			// Proximity startle: cursor near resting cat
			if (!proximityAwake && !fidgeting && currentState === State.SLEEP) {
				if (cursorDistToNeko() < PROXIMITY_DIST) {
					proximityAwake = true;
					proximityTicks = 0;
					setNekoState(State.AWAKE);
				}
			}

			if (proximityAwake) {
				proximityTicks++;
				currentFrame = getFrameIndex();
				if (proximityTicks >= PROXIMITY_AWAKE_TICKS) {
					proximityAwake = false;
					proximityTicks = 0;
					// Go back to sleep if cursor moved away, otherwise stay alert
					if (cursorDistToNeko() >= PROXIMITY_DIST) {
						setNekoState(State.SLEEP);
					} else {
						// Stay awake while cursor is near
						proximityAwake = true;
						proximityTicks = 0;
					}
				}
				currentFrame = getFrameIndex();
				return;
			}

			// Random fidget during sleep
			if (!fidgeting && currentState === State.SLEEP) {
				if (Math.random() < FIDGET_CHANCE) {
					fidgeting = true;
					fidgetTicks = 0;
					// Randomly pick scratch or yawn
					setNekoState(Math.random() < 0.5 ? State.SCRATCH : State.YAWN);
				}
			}

			if (fidgeting) {
				fidgetTicks++;
				if (tickCount % 2 === 0 && stateCount < 9999) stateCount++;
				currentFrame = getFrameIndex();
				if (fidgetTicks >= FIDGET_DURATION) {
					fidgeting = false;
					fidgetTicks = 0;
					setNekoState(State.SLEEP);
				}
				currentFrame = getFrameIndex();
				return;
			}

			// Normal idle progression at home
			if (currentState === State.SLEEP) {
				currentFrame = getFrameIndex();
				return;
			}

			// Run the idle chain: STOP -> WASH -> SCRATCH -> YAWN -> SLEEP
			if (tickCount % 2 === 0 && stateCount < 9999) stateCount++;

			switch (currentState) {
				case State.STOP:
					if (stateCount >= STOP_TIME) setNekoState(State.WASH);
					break;
				case State.WASH:
					if (stateCount >= WASH_TIME) setNekoState(State.SCRATCH);
					break;
				case State.SCRATCH:
					if (stateCount >= SCRATCH_TIME) setNekoState(State.YAWN);
					break;
				case State.YAWN:
					if (stateCount >= YAWN_TIME) setNekoState(State.SLEEP);
					break;
				case State.AWAKE:
					if (stateCount >= AWAKE_TIME) setNekoState(State.STOP);
					break;
			}

			currentFrame = getFrameIndex();
			return;
		}

		// --- Active chasing / returning home ---
		const speed = returningHome ? SPEED_MAX : getSpeed();

		const targetX = returningHome ? HOME_X + SPRITE_SIZE / 2 : mouseX;
		const targetY = returningHome ? HOME_Y + SPRITE_SIZE : mouseY;

		oldToX = toX;
		oldToY = toY;
		toX = targetX;
		toY = targetY;

		// Calculate distance to target
		const largeX = toX - logicX - SPRITE_SIZE / 2;
		const largeY = toY - logicY - SPRITE_SIZE + 1;
		const doubleLength = largeX * largeX + largeY * largeY;

		if (doubleLength !== 0) {
			const length = Math.sqrt(doubleLength);
			if (length <= speed) {
				dx = Math.round(largeX);
				dy = Math.round(largeY);
			} else {
				dx = Math.round((speed * largeX) / length);
				dy = Math.round((speed * largeY) / length);
			}
		} else {
			dx = 0;
			dy = 0;
		}

		// Increment tick counter
		tickCount = (tickCount + 1) % 9999;
		if (tickCount % 2 === 0 && stateCount < 9999) {
			stateCount++;
		}

		const maxX = window.innerWidth - SPRITE_SIZE;
		const maxY = window.innerHeight - SPRITE_SIZE;

		// State machine
		switch (currentState) {
			case State.STOP:
				if (returningHome) {
					returningHome = false;
					logicX = HOME_X;
					logicY = HOME_Y;
					prevLogicX = HOME_X;
					prevLogicY = HOME_Y;
					break;
				}
				if (moveStart()) {
					setNekoState(State.AWAKE);
				} else if (stateCount >= STOP_TIME) {
					if (dx < 0 && logicX <= 0) setNekoState(State.L_CLAW);
					else if (dx > 0 && logicX >= maxX) setNekoState(State.R_CLAW);
					else if (dy < 0 && logicY <= 0) setNekoState(State.U_CLAW);
					else if (dy > 0 && logicY >= maxY) setNekoState(State.D_CLAW);
					else setNekoState(State.WASH);
				}
				break;

			case State.WASH:
				if (moveStart()) setNekoState(State.AWAKE);
				else if (stateCount >= WASH_TIME) setNekoState(State.SCRATCH);
				break;

			case State.SCRATCH:
				if (moveStart()) setNekoState(State.AWAKE);
				else if (stateCount >= SCRATCH_TIME) setNekoState(State.YAWN);
				break;

			case State.YAWN:
				if (moveStart()) setNekoState(State.AWAKE);
				else if (stateCount >= YAWN_TIME) setNekoState(State.SLEEP);
				break;

			case State.SLEEP:
				if (moveStart()) setNekoState(State.AWAKE);
				break;

			case State.AWAKE:
				if (stateCount >= AWAKE_TIME + Math.floor(Math.random() * 20)) {
					calcDirection();
				}
				break;

			case State.U_MOVE:
			case State.D_MOVE:
			case State.L_MOVE:
			case State.R_MOVE:
			case State.UL_MOVE:
			case State.UR_MOVE:
			case State.DL_MOVE:
			case State.DR_MOVE: {
				let newX = logicX + dx;
				let newY = logicY + dy;
				const outside = newX <= 0 || newX >= maxX || newY <= 0 || newY >= maxY;

				calcDirection();

				// Clamp position
				if (newX < 0) newX = 0;
				else if (newX > maxX) newX = maxX;
				if (newY < 0) newY = 0;
				else if (newY > maxY) newY = maxY;

				const notMoved = newX === logicX && newY === logicY;

				if (outside && notMoved) {
					setNekoState(State.STOP);
					if (returningHome) {
						returningHome = false;
						logicX = HOME_X;
						logicY = HOME_Y;
					}
				} else {
					prevLogicX = logicX;
					prevLogicY = logicY;
					logicX = newX;
					logicY = newY;

					// Check if arrived home
					if (returningHome) {
						const distToHome = Math.abs(logicX - HOME_X) + Math.abs(logicY - HOME_Y);
						if (distToHome < SPEED_MAX) {
							returningHome = false;
							logicX = HOME_X;
							logicY = HOME_Y;
							prevLogicX = HOME_X;
							prevLogicY = HOME_Y;
							setNekoState(State.STOP);
						}
					}
				}
				break;
			}

			case State.U_CLAW:
			case State.D_CLAW:
			case State.L_CLAW:
			case State.R_CLAW:
				if (moveStart()) setNekoState(State.AWAKE);
				else if (stateCount >= CLAW_TIME) setNekoState(State.SCRATCH);
				break;
		}

		// Update the displayed frame
		currentFrame = getFrameIndex();
	}

	function startMovingTowards(targetX: number, targetY: number) {
		// Immediately compute direction and enter a movement state (skip AWAKE delay)
		toX = targetX;
		toY = targetY;
		oldToX = logicX;
		oldToY = logicY;

		const speed = returningHome ? SPEED_MAX : getSpeed();
		const largeX = toX - logicX - SPRITE_SIZE / 2;
		const largeY = toY - logicY - SPRITE_SIZE + 1;
		const length = Math.sqrt(largeX * largeX + largeY * largeY);

		if (length > 0) {
			dx = Math.round((speed * largeX) / length);
			dy = Math.round((speed * largeY) / length);
		}

		calcDirection();
		currentFrame = getFrameIndex();
	}

	function handleClick() {
		// Cancel any idle animations
		fidgeting = false;
		proximityAwake = false;
		beingPetted = false;

		if (chasing) {
			// Stop chasing, run back home immediately
			chasing = false;
			returningHome = true;
			startMovingTowards(HOME_X + SPRITE_SIZE / 2, HOME_Y + SPRITE_SIZE);
			localStorage.setItem(STORAGE_KEY, "false");
		} else if (!returningHome) {
			// Resume chasing - start moving toward cursor immediately
			chasing = true;
			startMovingTowards(mouseX, mouseY);
			localStorage.setItem(STORAGE_KEY, "true");
		}
	}

	function handleDblClick() {
		// Double-click to "pet" the cat - plays wash animation
		if (!chasing && !returningHome) {
			beingPetted = true;
			petTicks = 0;
			fidgeting = false;
			proximityAwake = false;
			setNekoState(State.WASH);
			currentFrame = getFrameIndex();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;
	}

	onMount(() => {
		// Load persisted chase state
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "false") {
			chasing = false;
			logicX = HOME_X;
			logicY = HOME_Y;
			prevLogicX = HOME_X;
			prevLogicY = HOME_Y;
			renderX = HOME_X;
			renderY = HOME_Y;
			setNekoState(State.STOP);
			currentFrame = getFrameIndex();
		} else {
			chasing = true;
			logicX = HOME_X;
			logicY = HOME_Y;
			prevLogicX = HOME_X;
			prevLogicY = HOME_Y;
			renderX = HOME_X;
			renderY = HOME_Y;
		}

		mouseX = HOME_X;
		mouseY = HOME_Y;

		window.addEventListener("mousemove", handleMouseMove);

		// Logic tick at fixed interval
		lastLogicTime = performance.now();
		const logicInterval = setInterval(() => {
			prevLogicX = logicX;
			prevLogicY = logicY;
			logicTick();
			lastLogicTime = performance.now();
		}, LOGIC_INTERVAL);

		// Render loop: interpolate position smoothly between logic ticks
		let rafId: number;
		function render() {
			const now = performance.now();
			const elapsed = now - lastLogicTime;
			const t = Math.min(elapsed / LOGIC_INTERVAL, 1);

			// Lerp between previous and current logic position
			renderX = prevLogicX + (logicX - prevLogicX) * t;
			renderY = prevLogicY + (logicY - prevLogicY) * t;

			rafId = requestAnimationFrame(render);
		}
		rafId = requestAnimationFrame(render);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			clearInterval(logicInterval);
			cancelAnimationFrame(rafId);
		};
	});
</script>

<button
	type="button"
	onclick={handleClick}
	ondblclick={handleDblClick}
	class="fixed z-9999 cursor-pointer border-none bg-transparent p-0"
	style="left: {renderX}px; top: {renderY}px;"
>
	<img
		src={spriteSrc}
		alt="Neko"
		width={SPRITE_SIZE}
		height={SPRITE_SIZE}
		class="block [image-rendering:pixelated]"
	/>
</button>
