/** Draws the click explosion on a temporary full-screen canvas. */

type Rgb = [number, number, number];

const FIRE_RAMP: Rgb[] = [
	[255, 255, 255],
	[255, 224, 110],
	[255, 146, 40],
	[205, 66, 30],
	[92, 82, 76]
];

// [delay in seconds, scale]
const BLASTS: Array<[number, number]> = [
	[0, 0.9],
	[0.32, 1.3],
	[0.68, 1.7]
];
const FINALE_AT = 1.15;
const FINALE_SCALE = 2.4;
const TOTAL_MS = 5500;

const BEAM_DESCENT = 0.12;
const BEAM_SUSTAIN = 0.55;
const BEAM_FADE = 0.35;

type FirePuff = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	birth: number;
	life: number;
	r0: number;
	growth: number;
	dragK: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; birth: number; life: number };

type Debris = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	birth: number;
	life: number;
	size: number;
	angle: number;
	spin: number;
};

type Smoke = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	birth: number;
	life: number;
	r0: number;
	growth: number;
};

type Ember = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	birth: number;
	life: number;
	swayAmp: number;
	swayFreq: number;
	swayPhase: number;
};

type Flash = { x: number; y: number; birth: number; scale: number };
type Wave = { x: number; y: number; birth: number; scale: number };
type Shake = { birth: number; amp: number; dur: number };
type Beam = { x: number; y: number; birth: number };

type Stage = {
	fire: FirePuff[];
	sparks: Spark[];
	debris: Debris[];
	smoke: Smoke[];
	embers: Ember[];
	flashes: Flash[];
	waves: Wave[];
	shakes: Shake[];
	beams: Beam[];
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function lerpRamp(ramp: Rgb[], q: number): Rgb {
	const pos = Math.min(0.999, Math.max(0, q)) * (ramp.length - 1);
	const i = Math.floor(pos);
	const f = pos - i;
	const [a, b] = [ramp[i], ramp[i + 1]];
	return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function scatter(x: number, y: number, speedMin: number, speedMax: number) {
	const angle = rand(0, Math.PI * 2);
	const speed = rand(speedMin, speedMax);
	return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

export type ExplodeOptions = {
	/** Runs when the final blast lands. */
	onFinale?: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function explode(x: number, y: number, options: ExplodeOptions = {}) {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const width = window.innerWidth;
	const height = window.innerHeight;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.cssText =
		"position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;";
	ctx.scale(dpr, dpr);
	document.body.appendChild(canvas);

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const stage: Stage = {
		fire: [],
		sparks: [],
		debris: [],
		smoke: [],
		embers: [],
		flashes: [],
		waves: [],
		shakes: [],
		beams: []
	};

	const edge = 40;
	const [firstDelay, firstScale] = BLASTS[0];
	spawnBurst(stage, x, y, firstScale, firstDelay, reduceMotion);
	for (const [delay, scale] of BLASTS.slice(1)) {
		const bx = clamp(x + rand(-160, 160), edge, width - edge);
		const by = clamp(y + rand(-160, 160), edge, height - edge);
		spawnBurst(stage, bx, by, scale, delay, reduceMotion);
	}

	stage.beams.push({ x, y, birth: FINALE_AT - BEAM_DESCENT });
	spawnBeamSparks(stage, x, y, FINALE_AT);
	spawnBurst(stage, x, y, FINALE_SCALE, FINALE_AT, reduceMotion);
	stage.waves.push({ x, y, birth: FINALE_AT + 0.09, scale: FINALE_SCALE * 1.3 });
	spawnEmbers(stage, x, y, FINALE_AT + 0.12);
	if (!reduceMotion) stage.shakes.push({ birth: FINALE_AT, amp: 20, dur: 0.7 });

	const previousBodyTransform = document.body.style.transform;
	let start: number | null = null;
	let rafId = 0;
	let finaleFired = false;

	const cleanup = () => {
		cancelAnimationFrame(rafId);
		document.body.style.transform = previousBodyTransform;
		canvas.remove();
	};

	const frame = (now: number) => {
		start ??= now;
		const t = (now - start) / 1000;

		if (!finaleFired && t >= FINALE_AT) {
			finaleFired = true;
			options.onFinale?.();
		}

		ctx.clearRect(0, 0, width, height);

		drawWaves(ctx, stage.waves, t);
		drawSmoke(ctx, stage.smoke, t);

		ctx.globalCompositeOperation = "lighter";
		drawFire(ctx, stage.fire, t);
		drawSparks(ctx, stage.sparks, t);
		drawEmbers(ctx, stage.embers, t);
		drawBeams(ctx, stage.beams, t);
		drawFlashes(ctx, stage.flashes, width, height, t);
		ctx.globalCompositeOperation = "source-over";

		drawDebris(ctx, stage.debris, t);
		applyShake(stage.shakes, t, previousBodyTransform);

		if (t * 1000 < TOTAL_MS) {
			rafId = requestAnimationFrame(frame);
		} else {
			cleanup();
		}
	};
	rafId = requestAnimationFrame(frame);

	return cleanup;
}

function spawnBurst(
	stage: Stage,
	x: number,
	y: number,
	scale: number,
	birth: number,
	reduceMotion: boolean
) {
	const count = (n: number) => Math.round(n * Math.min(scale, 2));

	for (let i = 0; i < count(24); i++) {
		stage.fire.push({
			...scatter(x, y, 30 * scale, 330 * scale),
			birth: birth + rand(0, 0.05),
			life: rand(0.4, 0.8),
			r0: rand(10, 26) * scale,
			growth: rand(18, 55) * scale,
			dragK: 3
		});
	}

	for (let i = 0; i < count(40); i++) {
		stage.sparks.push({
			...scatter(x, y, 260 * scale, 900 * scale),
			birth,
			life: rand(0.45, 1)
		});
	}

	for (let i = 0; i < count(14); i++) {
		stage.debris.push({
			...scatter(x, y, 150 * scale, 620 * scale),
			birth,
			life: rand(0.8, 1.3),
			size: rand(3, 7) * Math.sqrt(scale),
			angle: rand(0, Math.PI * 2),
			spin: rand(-12, 12)
		});
	}

	for (let i = 0; i < count(14); i++) {
		stage.smoke.push({
			...scatter(x, y, 10 * scale, 90 * scale),
			birth: birth + rand(0.1, 0.35),
			life: rand(1.1, 1.8),
			r0: rand(14, 30) * scale,
			growth: rand(30, 60) * scale
		});
	}

	stage.flashes.push({ x, y, birth, scale });
	stage.waves.push({ x, y, birth, scale });
	if (!reduceMotion) {
		stage.shakes.push({ birth, amp: 7 * scale, dur: 0.35 + 0.1 * scale });
	}
}

function spawnBeamSparks(stage: Stage, x: number, y: number, birth: number) {
	for (let i = 0; i < 36; i++) {
		const side = Math.random() < 0.5 ? -1 : 1;
		stage.sparks.push({
			x: x + side * rand(4, 14),
			y: rand(0, y),
			vx: side * rand(80, 320),
			vy: rand(-60, 60),
			birth: birth + rand(0, BEAM_SUSTAIN),
			life: rand(0.3, 0.7)
		});
	}

	for (let i = 0; i < 12; i++) {
		stage.smoke.push({
			x: x + rand(-24, 24),
			y: y - rand(0, 40),
			vx: rand(-50, 50),
			vy: rand(-140, -60),
			birth: birth + rand(0.4, 1.1),
			life: rand(1.4, 2.2),
			r0: rand(20, 38),
			growth: rand(40, 80)
		});
	}
}

function spawnEmbers(stage: Stage, x: number, y: number, birth: number) {
	for (let i = 0; i < 56; i++) {
		stage.embers.push({
			x: x + rand(-60, 60),
			y: y + rand(-40, 0),
			vx: rand(-260, 260),
			vy: rand(-620, -150),
			birth: birth + rand(0, 0.15),
			life: rand(1.8, 3.6),
			swayAmp: rand(8, 30),
			swayFreq: rand(2, 5),
			swayPhase: rand(0, Math.PI * 2)
		});
	}
}

function drawBeams(ctx: CanvasRenderingContext2D, beams: Beam[], t: number) {
	for (const b of beams) {
		const age = t - b.birth;
		if (age < 0 || age >= BEAM_DESCENT + BEAM_SUSTAIN + BEAM_FADE) continue;

		// Quadratic descent accelerates the beam tip.
		const descent = Math.min(1, age / BEAM_DESCENT);
		const tipY = b.y * descent * descent;

		const fadeStart = BEAM_DESCENT + BEAM_SUSTAIN;
		const intensity = age > fadeStart ? 1 - (age - fadeStart) / BEAM_FADE : 1;
		const flicker = 0.82 + 0.18 * Math.sin(age * 47) * Math.sin(age * 31 + 1.7);
		const coreW = 3 + 11 * intensity * flicker;

		// Draw the outer glow, sheath, and core from widest to narrowest.
		const layers: Array<[number, string]> = [
			[coreW * 5, `rgba(255,150,40,${0.16 * intensity})`],
			[coreW * 2.4, `rgba(255,205,110,${0.35 * intensity})`],
			[coreW, `rgba(255,252,240,${0.95 * intensity})`]
		];
		for (const [w, color] of layers) {
			const gradient = ctx.createLinearGradient(b.x - w, 0, b.x + w, 0);
			gradient.addColorStop(0, "rgba(255,200,120,0)");
			gradient.addColorStop(0.5, color);
			gradient.addColorStop(1, "rgba(255,200,120,0)");
			ctx.fillStyle = gradient;
			ctx.fillRect(b.x - w, 0, w * 2, tipY);
		}

		if (descent >= 1) {
			const r = 46 * intensity * (0.9 + 0.1 * Math.sin(age * 40));
			const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
			gradient.addColorStop(0, `rgba(255,255,245,${0.9 * intensity})`);
			gradient.addColorStop(0.4, `rgba(255,190,90,${0.55 * intensity})`);
			gradient.addColorStop(1, "rgba(255,140,50,0)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

function drawFlashes(
	ctx: CanvasRenderingContext2D,
	flashes: Flash[],
	width: number,
	height: number,
	t: number
) {
	for (const f of flashes) {
		const duration = 0.14 + 0.05 * f.scale;
		const q = (t - f.birth) / duration;
		if (q < 0 || q >= 1) continue;
		const alpha = (1 - q) ** 2 * 0.9;
		const radius = Math.max(width, height) * 0.5 * Math.min(f.scale, 1.8);
		const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
		gradient.addColorStop(0, `rgba(255,252,235,${alpha})`);
		gradient.addColorStop(0.25, `rgba(255,220,140,${alpha * 0.6})`);
		gradient.addColorStop(1, "rgba(255,220,140,0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}
}

function drawWaves(ctx: CanvasRenderingContext2D, waves: Wave[], t: number) {
	for (const w of waves) {
		const q = (t - w.birth) / 0.5;
		if (q < 0 || q >= 1) continue;
		const eased = 1 - (1 - q) ** 3;
		ctx.beginPath();
		ctx.arc(w.x, w.y, 20 + eased * 420 * w.scale, 0, Math.PI * 2);
		ctx.strokeStyle = `rgba(255,235,200,${(1 - q) * 0.55})`;
		ctx.lineWidth = (2 + (1 - q) * 14) * Math.sqrt(w.scale);
		ctx.stroke();
	}
}

function drawFire(ctx: CanvasRenderingContext2D, puffs: FirePuff[], t: number) {
	for (const p of puffs) {
		const age = t - p.birth;
		const q = age / p.life;
		if (age < 0 || q >= 1) continue;
		const drag = Math.exp(-p.dragK * age);
		const px = p.x + (p.vx / p.dragK) * (1 - drag);
		const py = p.y + (p.vy / p.dragK) * (1 - drag);
		const r = p.r0 + p.growth * (1 - Math.exp(-3 * age));
		const [cr, cg, cb] = lerpRamp(FIRE_RAMP, q);
		const alpha = (1 - q) * 0.85;
		const gradient = ctx.createRadialGradient(px, py, 0, px, py, r);
		gradient.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha})`);
		gradient.addColorStop(1, `rgba(${cr | 0},${(cg * 0.6) | 0},${(cb * 0.4) | 0},0)`);
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(px, py, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[], t: number) {
	const gravity = 1200;
	ctx.lineCap = "round";
	for (const s of sparks) {
		const age = t - s.birth;
		const q = age / s.life;
		if (age < 0 || q >= 1) continue;
		const px = s.x + s.vx * age;
		const py = s.y + s.vy * age + 0.5 * gravity * age * age;
		const vy = s.vy + gravity * age;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.lineTo(px - s.vx * 0.02, py - vy * 0.02);
		ctx.strokeStyle = `rgba(255,${(210 - q * 120) | 0},${(110 - q * 90) | 0},${1 - q})`;
		ctx.lineWidth = 2.5 * (1 - q) + 0.5;
		ctx.stroke();
	}
}

function drawEmbers(ctx: CanvasRenderingContext2D, embers: Ember[], t: number) {
	const gravity = 300;
	for (const e of embers) {
		const age = t - e.birth;
		const q = age / e.life;
		if (age < 0 || q >= 1) continue;
		const sway = Math.sin(age * e.swayFreq + e.swayPhase) * e.swayAmp * Math.min(1, age);
		const px = e.x + e.vx * age * Math.exp(-age) + sway;
		const py = e.y + e.vy * age * Math.exp(-age) + 0.5 * gravity * age * age;
		const flicker = 0.7 + 0.3 * Math.sin(age * 20 + e.swayPhase);
		ctx.fillStyle = `rgba(255,${(150 - q * 90) | 0},40,${(1 - q) * flicker})`;
		ctx.beginPath();
		ctx.arc(px, py, 1.2 + (1 - q) * 1.6, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawDebris(ctx: CanvasRenderingContext2D, debris: Debris[], t: number) {
	const gravity = 1500;
	for (const d of debris) {
		const age = t - d.birth;
		const q = age / d.life;
		if (age < 0 || q >= 1) continue;
		const px = d.x + d.vx * age;
		const py = d.y + d.vy * age + 0.5 * gravity * age * age;
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(d.angle + d.spin * age);
		ctx.fillStyle = `rgba(52,44,38,${1 - q * 0.6})`;
		ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.7);
		ctx.restore();
	}
}

function drawSmoke(ctx: CanvasRenderingContext2D, smoke: Smoke[], t: number) {
	for (const s of smoke) {
		const age = t - s.birth;
		const q = age / s.life;
		if (age < 0 || q >= 1) continue;
		const drag = Math.exp(-1.5 * age);
		const px = s.x + (s.vx / 1.5) * (1 - drag);
		const py = s.y + (s.vy / 1.5) * (1 - drag) - 30 * age;
		const r = s.r0 + s.growth * age;
		const alpha = Math.sin(Math.min(1, q) * Math.PI) * 0.28;
		const gradient = ctx.createRadialGradient(px, py, 0, px, py, r);
		gradient.addColorStop(0, `rgba(70,64,60,${alpha})`);
		gradient.addColorStop(1, "rgba(70,64,60,0)");
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(px, py, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

function applyShake(shakes: Shake[], t: number, restoreTo: string) {
	let ax = 0;
	let ay = 0;
	let active = false;
	for (const s of shakes) {
		const q = (t - s.birth) / s.dur;
		if (q < 0 || q >= 1) continue;
		active = true;
		const falloff = (1 - q) ** 2 * s.amp;
		const angle = rand(0, Math.PI * 2);
		ax += Math.cos(angle) * falloff;
		ay += Math.sin(angle) * falloff;
	}
	document.body.style.transform = active ? `translate(${ax}px, ${ay}px)` : restoreTo;
}
