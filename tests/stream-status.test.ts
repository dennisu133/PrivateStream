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
		expect(await status.isLive(1000)).toBe(true);
		active = false;
		expect(await status.isLive(2000)).toBe(true); // cached
		expect(fetches).toBe(1);
		expect(await status.isLive(3001)).toBe(false); // TTL expired
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
		expect(await status.isLive(1000)).toBe(true);
		fail = true;
		expect(await status.isLive(5000)).toBe(true);
	});

	test("stays offline without a streams URL", async () => {
		const status = createStreamStatus({ srsStreamsUrl: null });
		expect(await status.isLive()).toBe(false);
	});
});
