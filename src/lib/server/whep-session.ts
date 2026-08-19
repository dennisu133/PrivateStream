/** Rewrites an SRS session location to this proxy, rejecting foreign origins. */
export function toProxySessionPath(srsLocation: string, srsWhepUrl: string): string | null {
	const target = resolveAgainstSrsOrigin(srsLocation, srsWhepUrl);
	return target ? `/api/whep?loc=${encodeURIComponent(target.pathname + target.search)}` : null;
}

/** Resolves a client-provided session location against SRS, rejecting foreign origins. */
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
