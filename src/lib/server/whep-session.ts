/**
 * Helpers for the WHEP session resource (RFC draft-ietf-wish-whep).
 *
 * SRS answers a WHEP offer with a `Location` header identifying the session,
 * which the client later DELETEs to tear the session down. The proxy rewrites
 * that header so the client talks to `/api/whep` (authenticated, same-origin)
 * instead of SRS directly, and never learns the SRS address.
 */

/**
 * Rewrites the `Location` header of an SRS answer into a same-origin proxy URL.
 * Returns null when the location is malformed or points away from the SRS
 * origin, in which case no teardown URL is offered to the client.
 */
export function toProxySessionPath(srsLocation: string, srsWhepUrl: string): string | null {
	const target = resolveAgainstSrsOrigin(srsLocation, srsWhepUrl);
	return target ? `/api/whep?loc=${encodeURIComponent(target.pathname + target.search)}` : null;
}

/**
 * Resolves a client-provided session location back into a full SRS URL.
 * Only URLs on the SRS origin are accepted, so a client cannot use the
 * DELETE proxy to reach anything except the SRS server it already streams from.
 */
export function toSrsSessionUrl(location: string, srsWhepUrl: string): URL | null {
	return resolveAgainstSrsOrigin(location, srsWhepUrl);
}

function resolveAgainstSrsOrigin(location: string, srsWhepUrl: string): URL | null {
	try {
		const base = new URL(srsWhepUrl);
		const resolved = new URL(location, base);
		return resolved.origin === base.origin ? resolved : null;
	} catch {
		return null;
	}
}
