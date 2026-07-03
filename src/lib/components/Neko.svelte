<script lang="ts">
	import { onMount } from "svelte";

	import spriteSheet from "$lib/assets/neko/java.png";

	// --- Sprite sheet geometry (8x4 grid of 32px cells with 1px gutters) ---
	const SHEET_COLS = 8;
	const CELL_SIZE = 32;
	const CELL_STRIDE = 33; // cell + gutter
	const SHEET_W = 263;
	const SHEET_H = 131;
	const DISPLAY_SIZE = 48;
	const SCALE = DISPLAY_SIZE / CELL_SIZE;

	// --- Configuration ---
	const SPEED_MIN = 8; // minimum speed (close to cursor)
	const SPEED_MAX = 24; // maximum speed (far from cursor)
	const SPEED_RAMP_DIST = 200; // distance at which max speed is reached
	const IDLE_SPACE = 10;
	const LOGIC_INTERVAL = 125; // ms between logic ticks (~8 fps)
	const HOME_X = 20;
	const HOME_Y = 20;
	const STORAGE_KEY = "neko-chasing";

	// --- Proximity / fidget config ---
	const PROXIMITY_DIST = 80; // px - cursor distance to trigger startle
	const PROXIMITY_AWAKE_TICKS = 8; // how long to stay awake when startled
	const FIDGET_CHANCE = 0.001; // chance per tick to fidget during sleep (~once per 2 min)
	const FIDGET_DURATION = 6; // ticks for a fidget animation

	// --- Pounce config ---
	const POUNCE_DIST = 120; // freeze and wind up inside this distance
	const POUNCE_MIN_DIST = 60; // no windup at point-blank range, just walk
	const POUNCE_ESCAPE = 240; // prey escaped: abort the windup/leap, re-arm beyond this
	const POUNCE_SPEED = 44;
	const WINDUP_MIN_TICKS = 12; // freeze duration before the leap (1.5s - 2.5s)
	const WINDUP_MAX_TICKS = 20;
	const SIT_OFFSET = 40; // walking arrivals settle beside the cursor, not on it
	const CATCH_RADIUS = 12; // resting with the cursor this close to her front paws traps it
	const EDGE_PUSH = 80; // how far past the viewport edge an escaped cursor is projected

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

	type ChasePhase = "run" | "windup" | "pounce" | "settle";

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

	// --- Animation table: [state] = [cell0, cell1] (sheet cell indices, row-major) ---
	const ANIMATION: [number, number][] = [];
	ANIMATION[State.STOP] = [0, 0];
	ANIMATION[State.WASH] = [2, 3];
	ANIMATION[State.SCRATCH] = [3, 2];
	ANIMATION[State.YAWN] = [4, 4];
	ANIMATION[State.SLEEP] = [5, 6];
	ANIMATION[State.AWAKE] = [7, 7];
	ANIMATION[State.U_MOVE] = [16, 17];
	ANIMATION[State.D_MOVE] = [8, 9];
	ANIMATION[State.L_MOVE] = [20, 21];
	ANIMATION[State.R_MOVE] = [12, 13];
	ANIMATION[State.UL_MOVE] = [18, 19];
	ANIMATION[State.UR_MOVE] = [14, 15];
	ANIMATION[State.DL_MOVE] = [22, 23];
	ANIMATION[State.DR_MOVE] = [10, 11];
	ANIMATION[State.U_CLAW] = [28, 29];
	ANIMATION[State.D_CLAW] = [24, 25];
	ANIMATION[State.L_CLAW] = [30, 31];
	ANIMATION[State.R_CLAW] = [26, 27];

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

	// --- Hunt behavior state ---
	let chasePhase: ChasePhase = $state("run"); // reactive: drives the windup shake class
	let windupCount = 0;
	let windupDuration = 0; // always set on windup entry
	let sitOffsetX = SIT_OFFSET;
	let sitOffsetY = 6;

	// --- Caught cursor state ---
	let caught = $state(false);
	let catchX = 0;
	let catchY = 0;

	$effect(() => {
		if (caught) {
			document.body.style.cursor = "none";
			return () => {
				document.body.style.cursor = "";
			};
		}
	});

	// --- Derived sheet position for the current frame ---
	let bgX = $derived(-(currentFrame % SHEET_COLS) * CELL_STRIDE * SCALE);
	let bgY = $derived(-Math.floor(currentFrame / SHEET_COLS) * CELL_STRIDE * SCALE);

	// --- Helper functions ---
	function moveStart(): boolean {
		return !(
			oldToX >= toX - IDLE_SPACE &&
			oldToX <= toX + IDLE_SPACE &&
			oldToY >= toY - IDLE_SPACE &&
			oldToY <= toY + IDLE_SPACE
		);
	}

	function isMoveState(state: NekoState): boolean {
		return state >= State.U_MOVE && state <= State.DR_MOVE;
	}

	function newSitSpot() {
		sitOffsetX = (Math.random() < 0.5 ? -1 : 1) * SIT_OFFSET;
		sitOffsetY = Math.random() * 20 - 6;
	}

	function setNekoState(state: NekoState) {
		tickCount = 0;
		stateCount = 0;
		currentState = state;
		if (state === State.AWAKE) {
			// New chase segment: pick a fresh spot beside the cursor
			newSitSpot();
		}
	}

	function getFrameIndex(): number {
		const anim = ANIMATION[currentState];
		if (!anim) return 0;
		if (currentState === State.SLEEP) return anim[(tickCount >> 2) & 1];
		if (isMoveState(currentState) && chasePhase === "windup") return anim[0]; // hold the crouch
		return anim[tickCount & 1];
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

	// Her "front paws" anchor: the bottom-center of the sprite, the point she
	// plants on targets. All cursor distances and thresholds measure from here.
	function pawX(): number {
		return logicX + DISPLAY_SIZE / 2;
	}

	function pawY(): number {
		return logicY + DISPLAY_SIZE - 1;
	}

	function distToCursor(): number {
		return Math.hypot(mouseX - pawX(), mouseY - pawY());
	}

	function getSpeed(): number {
		// Variable speed: accelerate when further from cursor
		const t = Math.min(distToCursor() / SPEED_RAMP_DIST, 1);
		return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * t;
	}

	// The point she is currently heading for: home anchor, the cursor itself while
	// hunting (windup through post-leap settle) or holding a caught cursor, or a
	// spot beside the cursor.
	function computeTarget(): [number, number] {
		if (returningHome) return [HOME_X + DISPLAY_SIZE / 2, HOME_Y + DISPLAY_SIZE];
		if (caught || chasePhase !== "run") return [mouseX, mouseY];
		return [mouseX + sitOffsetX, mouseY + sitOffsetY];
	}

	function logicTick() {
		const atHome = !chasing && !returningHome;

		// --- Idle at home: proximity reaction + fidgets ---
		if (atHome) {
			tickCount = (tickCount + 1) % 9999;

			// Proximity startle: cursor near resting cat
			if (!proximityAwake && !fidgeting && currentState === State.SLEEP) {
				if (distToCursor() < PROXIMITY_DIST) {
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
					if (distToCursor() >= PROXIMITY_DIST) {
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
		const [targetX, targetY] = computeTarget();

		oldToX = toX;
		oldToY = toY;
		toX = targetX;
		toY = targetY;

		// Distance from her front paws to the target
		const largeX = toX - pawX();
		const largeY = toY - pawY();
		const length = Math.sqrt(largeX * largeX + largeY * largeY);

		// Hunt phases: run -> windup (freeze + wiggle) -> pounce -> settle, only while chasing
		if (!returningHome && isMoveState(currentState)) {
			if (chasePhase !== "run" && length > POUNCE_ESCAPE) {
				chasePhase = "run"; // prey got away: back to a normal chase, ready to hunt again
			}
			if (chasePhase === "run" && length < POUNCE_DIST && length > POUNCE_MIN_DIST) {
				chasePhase = "windup";
				windupCount = 0;
				windupDuration =
					WINDUP_MIN_TICKS + Math.floor(Math.random() * (WINDUP_MAX_TICKS - WINDUP_MIN_TICKS));
			}
			if (chasePhase === "windup") {
				if (windupCount >= windupDuration) {
					chasePhase = "pounce";
				} else {
					// Freeze in place before the leap; the shake comes from CSS
					windupCount++;
					dx = 0;
					dy = 0;
					tickCount = (tickCount + 1) % 9999;
					currentFrame = getFrameIndex();
					return;
				}
			}
		} else if (!returningHome) {
			chasePhase = "run";
		}

		let speed = returningHome ? SPEED_MAX : getSpeed();
		if (chasePhase === "pounce") speed = POUNCE_SPEED;

		if (length !== 0) {
			if (length <= speed) {
				dx = Math.round(largeX);
				dy = Math.round(largeY);
				// Landed on the prey: stay locked onto the cursor until she comes to rest
				if (chasePhase === "pounce") chasePhase = "settle";
			} else {
				dx = Math.round((speed * largeX) / length);
				dy = Math.round((speed * largeY) / length);
			}
		} else {
			dx = 0;
			dy = 0;
			chasePhase = "run";
		}

		// Increment tick counter
		tickCount = (tickCount + 1) % 9999;
		if (tickCount % 2 === 0 && stateCount < 9999) {
			stateCount++;
		}

		const maxX = window.innerWidth - DISPLAY_SIZE;
		const maxY = window.innerHeight - DISPLAY_SIZE;

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
				// Frustrated meow (the yawn frame) before giving up and dozing off
				else if (stateCount >= CLAW_TIME) setNekoState(State.YAWN);
				break;
		}

		// Catch: coming to rest on top of the cursor traps it under her paws
		if (
			!caught &&
			!returningHome &&
			!isMoveState(currentState) &&
			currentState !== State.AWAKE &&
			distToCursor() < CATCH_RADIUS
		) {
			caught = true;
			catchX = mouseX;
			catchY = mouseY;
		}

		// Update the displayed frame
		currentFrame = getFrameIndex();
	}

	function startMovingTowards() {
		// Immediately compute direction and enter a movement state (skip AWAKE delay)
		const [targetX, targetY] = computeTarget();
		toX = targetX;
		toY = targetY;
		oldToX = logicX;
		oldToY = logicY;

		const speed = returningHome ? SPEED_MAX : getSpeed();
		const largeX = toX - pawX();
		const largeY = toY - pawY();
		const length = Math.sqrt(largeX * largeX + largeY * largeY);

		if (length > 0) {
			dx = Math.round((speed * largeX) / length);
			dy = Math.round((speed * largeY) / length);
		}

		calcDirection();
		currentFrame = getFrameIndex();
	}

	function handleClick() {
		// Cancel any idle animations, release the cursor if she has it
		fidgeting = false;
		proximityAwake = false;
		caught = false;
		chasePhase = "run";

		if (chasing) {
			// Stop chasing, run back home immediately
			chasing = false;
			returningHome = true;
			startMovingTowards();
			localStorage.setItem(STORAGE_KEY, "false");
		} else if (!returningHome) {
			// Resume chasing - start moving toward cursor immediately
			chasing = true;
			newSitSpot();
			startMovingTowards();
			localStorage.setItem(STORAGE_KEY, "true");
		}
	}

	function handleMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;

		// The prey wriggles free once it moves clearly away from the catch spot;
		// smaller twitches stay pinned under her paws.
		if (caught) {
			const escaped = Math.hypot(mouseX - catchX, mouseY - catchY) > IDLE_SPACE;
			if (escaped) caught = false;
		}
	}

	function handleMouseOut(e: MouseEvent) {
		if (e.relatedTarget) return; // moved between elements, still inside the window

		// The cursor escaped the viewport: project the target past the nearest edge
		// so she runs there, claws the wall, meows, and gives up.
		mouseX = e.clientX;
		mouseY = e.clientY;
		const distLeft = e.clientX;
		const distRight = window.innerWidth - e.clientX;
		const distTop = e.clientY;
		const distBottom = window.innerHeight - e.clientY;
		const nearest = Math.min(distLeft, distRight, distTop, distBottom);
		if (nearest === distLeft) mouseX = -EDGE_PUSH;
		else if (nearest === distRight) mouseX = window.innerWidth + EDGE_PUSH;
		else if (nearest === distTop) mouseY = -EDGE_PUSH;
		else mouseY = window.innerHeight + EDGE_PUSH;

		caught = false; // it slipped out from under her paws
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
		window.addEventListener("mouseout", handleMouseOut);

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
			window.removeEventListener("mouseout", handleMouseOut);
			clearInterval(logicInterval);
			cancelAnimationFrame(rafId);
		};
	});
</script>

<button
	type="button"
	aria-label="Java the cat"
	onclick={handleClick}
	class="fixed z-9999 border-none bg-transparent p-0 {caught ? 'cursor-none' : 'cursor-pointer'}"
	style="left: {renderX}px; top: {renderY}px;"
>
	<div
		class="block [image-rendering:pixelated]"
		class:windup-shake={chasePhase === "windup"}
		style="width: {DISPLAY_SIZE}px; height: {DISPLAY_SIZE}px; background-image: url({spriteSheet}); background-repeat: no-repeat; background-size: {SHEET_W *
			SCALE}px {SHEET_H * SCALE}px; background-position: {bgX}px {bgY}px;"
	></div>
</button>

<style>
	/* Pre-pounce butt wiggle: whole-pixel jumps via steps() keep the sprite crisp */
	@keyframes windup-shake {
		0%,
		100% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(-1px, 0);
		}
		50% {
			transform: translate(1px, 1px);
		}
		75% {
			transform: translate(-1px, 1px);
		}
	}

	.windup-shake {
		animation: windup-shake 0.4s steps(1, end) infinite;
	}
</style>
