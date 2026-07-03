import { describe, expect, test } from "bun:test";
import { toProxySessionPath, toSrsSessionUrl } from "../src/lib/server/whep-session";

const srsWhepUrl = "http://192.168.1.100:1985/rtc/v1/whep/?app=live&stream=livestream";

describe("toProxySessionPath", () => {
	test("rewrites a relative SRS location into a proxy path", () => {
		const path = toProxySessionPath("/rtc/v1/whip/?action=delete&session=abc123", srsWhepUrl);
		expect(path).toBe(
			`/api/whep?loc=${encodeURIComponent("/rtc/v1/whip/?action=delete&session=abc123")}`
		);
	});

	test("accepts an absolute location on the SRS origin", () => {
		const path = toProxySessionPath(
			"http://192.168.1.100:1985/rtc/v1/whip/?action=delete&session=abc123",
			srsWhepUrl
		);
		expect(path).toBe(
			`/api/whep?loc=${encodeURIComponent("/rtc/v1/whip/?action=delete&session=abc123")}`
		);
	});

	test("rejects a location pointing at a foreign origin", () => {
		expect(toProxySessionPath("http://evil.example/steal", srsWhepUrl)).toBeNull();
		expect(toProxySessionPath("//evil.example/steal", srsWhepUrl)).toBeNull();
	});

	test("returns null for a malformed SRS base URL", () => {
		expect(toProxySessionPath("/rtc/v1/whip/?session=abc", "not a url")).toBeNull();
	});
});

describe("toSrsSessionUrl", () => {
	test("resolves a relative location against the SRS origin", () => {
		const url = toSrsSessionUrl("/rtc/v1/whip/?action=delete&session=abc123", srsWhepUrl);
		expect(url?.toString()).toBe(
			"http://192.168.1.100:1985/rtc/v1/whip/?action=delete&session=abc123"
		);
	});

	test("rejects absolute and protocol-relative foreign origins", () => {
		expect(toSrsSessionUrl("http://evil.example/x", srsWhepUrl)).toBeNull();
		expect(toSrsSessionUrl("//evil.example/x", srsWhepUrl)).toBeNull();
		expect(toSrsSessionUrl("http://192.168.1.100:9999/x", srsWhepUrl)).toBeNull();
	});

	test("round-trips the path produced by toProxySessionPath", () => {
		const proxyPath = toProxySessionPath("/rtc/v1/whip/?action=delete&session=abc123", srsWhepUrl);
		const loc = new URL(proxyPath!, "http://localhost").searchParams.get("loc");
		expect(toSrsSessionUrl(loc!, srsWhepUrl)?.toString()).toBe(
			"http://192.168.1.100:1985/rtc/v1/whip/?action=delete&session=abc123"
		);
	});
});
