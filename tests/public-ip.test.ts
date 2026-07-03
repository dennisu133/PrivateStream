import { describe, expect, test } from "bun:test";
import { createPublicIpResolver } from "../src/lib/server/public-ip";

const noopLog = () => {};

function textResponse(body: string, status = 200) {
	return new Response(body, { status });
}

describe("public IP resolver", () => {
	test("returns the static IP without contacting lookup services", async () => {
		let calls = 0;
		const resolver = createPublicIpResolver({
			staticIp: "203.0.113.7",
			lookupUrls: ["https://ip.example"],
			fetchFn: async () => {
				calls += 1;
				return textResponse("198.51.100.1");
			},
			log: noopLog
		});

		expect(await resolver.resolve()).toBe("203.0.113.7");
		expect(calls).toBe(0);
	});

	test("ignores an invalid static IP and falls back to lookups", async () => {
		const resolver = createPublicIpResolver({
			staticIp: "not-an-ip",
			lookupUrls: ["https://ip.example"],
			fetchFn: async () => textResponse("198.51.100.1"),
			log: noopLog
		});

		expect(await resolver.resolve()).toBe("198.51.100.1");
	});

	test("tries lookup services in order until one returns a valid IP", async () => {
		const seen: string[] = [];
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://down.example", "https://html.example", "https://ok.example"],
			fetchFn: async (input) => {
				const url = String(input);
				seen.push(url);
				if (url.startsWith("https://down.example")) return textResponse("", 503);
				if (url.startsWith("https://html.example")) return textResponse("<html>error</html>");
				return textResponse("198.51.100.1\n");
			},
			log: noopLog
		});

		expect(await resolver.resolve()).toBe("198.51.100.1");
		expect(seen).toHaveLength(3);
	});

	test("caches the resolved IP within the TTL and refreshes after expiry", async () => {
		let calls = 0;
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://ip.example"],
			cacheMs: 1_000,
			fetchFn: async () => {
				calls += 1;
				return textResponse(calls === 1 ? "198.51.100.1" : "198.51.100.2");
			},
			log: noopLog
		});

		expect(await resolver.resolve(0)).toBe("198.51.100.1");
		expect(await resolver.resolve(999)).toBe("198.51.100.1");
		expect(calls).toBe(1);

		expect(await resolver.resolve(1_000)).toBe("198.51.100.2");
		expect(calls).toBe(2);
	});

	test("serves the last known IP when every lookup fails", async () => {
		let fail = false;
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://ip.example"],
			cacheMs: 1_000,
			fetchFn: async () => {
				if (fail) throw new Error("network down");
				return textResponse("198.51.100.1");
			},
			log: noopLog
		});

		expect(await resolver.resolve(0)).toBe("198.51.100.1");
		fail = true;
		expect(await resolver.resolve(2_000)).toBe("198.51.100.1");
	});

	test("throws when every lookup fails and no IP was ever resolved", async () => {
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://ip.example"],
			fetchFn: async () => {
				throw new Error("network down");
			},
			log: noopLog
		});

		expect(resolver.resolve()).rejects.toThrow("All IP lookup services failed");
	});

	test("dedupes concurrent lookups into a single request", async () => {
		let calls = 0;
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://ip.example"],
			fetchFn: async () => {
				calls += 1;
				await new Promise((r) => setTimeout(r, 10));
				return textResponse("198.51.100.1");
			},
			log: noopLog
		});

		const results = await Promise.all([resolver.resolve(), resolver.resolve(), resolver.resolve()]);
		expect(results).toEqual(["198.51.100.1", "198.51.100.1", "198.51.100.1"]);
		expect(calls).toBe(1);
	});

	test("accepts IPv6 responses", async () => {
		const resolver = createPublicIpResolver({
			lookupUrls: ["https://ip.example"],
			fetchFn: async () => textResponse("2001:db8::1"),
			log: noopLog
		});

		expect(await resolver.resolve()).toBe("2001:db8::1");
	});
});
