import { describe, expect, test } from "bun:test";
import { createStreamStatus } from "../src/lib/server/stream-status";

const srsUrl = new URL("http://srs:1985/api/v1/streams/");
const srsResponse = (active: boolean) =>
	new Response(JSON.stringify({ code: 0, streams: [{ publish: { active } }] }));

describe("stream status", () => {
	test("queries the SRS API with a TTL cache", async () => {
		let fetches = 0;
		let active = true;
		const status = createStreamStatus({
			srsStreamsUrl: srsUrl,
			cacheTtlMs: 2000,
			fetchFn: async () => {
				fetches++;
				return srsResponse(active);
			}
		});
		expect((await status.get(1000)).live).toBe(true);
		active = false;
		expect((await status.get(2000)).live).toBe(true); // cached
		expect(fetches).toBe(1);
		expect((await status.get(3001)).live).toBe(false); // TTL expired
		expect(fetches).toBe(2);
	});

	test("keeps the last known state when SRS is unreachable", async () => {
		let fail = false;
		const status = createStreamStatus({
			srsStreamsUrl: srsUrl,
			cacheTtlMs: 0,
			log: () => {},
			fetchFn: async () => {
				if (fail) throw new Error("down");
				return srsResponse(true);
			}
		});
		expect((await status.get(1000)).live).toBe(true);
		fail = true;
		expect((await status.get(5000)).live).toBe(true);
	});

	test("stays offline without a streams URL", async () => {
		const status = createStreamStatus({ srsStreamsUrl: null });
		expect((await status.get()).live).toBe(false);
	});
});

test("counts only the configured stream and excludes its publisher", async () => {
	let streams = [
		{ app: "live", name: "livestream", clients: 3, publish: { active: true } },
		{ app: "live", name: "other", clients: 10, publish: { active: true } }
	];
	let fail = false;
	const status = createStreamStatus({
		srsStreamsUrl: srsUrl,
		stream: { app: "live", name: "livestream" },
		cacheTtlMs: 0,
		log: () => {},
		fetchFn: async () => {
			if (fail) throw new Error("unreachable");
			return Response.json({ code: 0, streams });
		}
	});
	expect(await status.get()).toEqual({ live: true, viewers: 2 });
	fail = true;
	expect(await status.get()).toEqual({ live: true, viewers: null });
	fail = false;
	streams = [streams[1]];
	expect(await status.get()).toEqual({ live: false, viewers: 0 });
	streams = [{ app: "live", name: "livestream", clients: 1, publish: { active: true } }];
	expect(await status.get()).toEqual({ live: true, viewers: 0 });
	streams[0].publish.active = false;
	expect(await status.get()).toEqual({ live: false, viewers: 1 });
});
