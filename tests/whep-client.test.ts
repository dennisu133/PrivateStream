import { afterEach, expect, test } from "bun:test";
import { startWhep } from "../src/lib/player/actions/whep";

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalPeer = Object.getOwnPropertyDescriptor(globalThis, "RTCPeerConnection");
let player: ReturnType<typeof startWhep> | undefined;

afterEach(() => {
	player?.destroy();
	player = undefined;
	globalThis.fetch = originalFetch;
	for (const [key, descriptor] of [
		["window", originalWindow],
		["RTCPeerConnection", originalPeer]
	] as const) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else Reflect.deleteProperty(globalThis, key);
	}
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => (resolve = done));
	return { promise, resolve };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
	const page = new EventTarget();
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: Object.assign(page, { setTimeout, setInterval })
	});
	const peers: Peer[] = [];
	class Peer {
		connectionState = "new";
		localDescription = { sdp: "offer" };
		answers: unknown[] = [];
		constructor() {
			peers.push(this);
		}
		addTransceiver() {}
		async createOffer() {
			return {};
		}
		async setLocalDescription() {}
		async setRemoteDescription(answer: unknown) {
			this.answers.push(answer);
		}
		close() {
			this.connectionState = "closed";
		}
	}
	Object.defineProperty(globalThis, "RTCPeerConnection", { configurable: true, value: Peer });
	const posts: ReturnType<typeof deferred<Response>>[] = [];
	const deletes: string[] = [];
	globalThis.fetch = (async (url: string, init?: RequestInit) => {
		if (url === "/api/stream") return Response.json({ live: true });
		if (init?.method === "POST") {
			const response = deferred<Response>();
			posts.push(response);
			return response.promise;
		}
		deletes.push(url);
		return new Response(null, { status: 204 });
	}) as typeof fetch;
	player = startWhep({ srcObject: null } as HTMLVideoElement);
	return { page, peers, posts, deletes };
}

function answer(session: string) {
	return new Response("answer", { headers: { Location: `/api/whep?loc=${session}` } });
}

test("deletes a session returned after player destruction without applying its answer", async () => {
	const { posts, peers, deletes } = setup();
	await flush();
	expect(posts).toHaveLength(1);
	player!.destroy();
	posts[0].resolve(answer("late"));
	await flush();
	expect(deletes).toEqual(["/api/whep?loc=late"]);
	expect(peers[0].answers).toHaveLength(0);
});

test("a stale response cannot overwrite the session created after bfcache restoration", async () => {
	const { page, posts, peers, deletes } = setup();
	await flush();
	page.dispatchEvent(new Event("pagehide"));
	page.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
	await flush();
	expect(posts).toHaveLength(2);
	posts[1].resolve(answer("current"));
	await flush();
	posts[0].resolve(answer("stale"));
	await flush();
	expect(peers[0].answers).toHaveLength(0);
	expect(peers[1].answers).toHaveLength(1);
	expect(deletes).toEqual(["/api/whep?loc=stale"]);
	player!.destroy();
	expect(deletes).toEqual(["/api/whep?loc=stale", "/api/whep?loc=current"]);
});
