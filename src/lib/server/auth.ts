import { env } from "$env/dynamic/private";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_PAYLOAD = "authenticated";

/**
 * Creates a signed session token using the site password hash as the secret key.
 * Returns null if SITE_PASSWORD_HASH is not configured.
 */
export function createSessionToken(): string | null {
  if (!env.SITE_PASSWORD_HASH) return null;
  
  const hmac = createHmac("sha256", env.SITE_PASSWORD_HASH);
  hmac.update(SESSION_PAYLOAD);
  return hmac.digest("hex");
}

/**
 * Verifies if the provided session token matches the expected signed token.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  
  const expectedToken = createSessionToken();
  if (!expectedToken) return false;
  
  if (token.length !== expectedToken.length) return false;

  return timingSafeEqual(
    Buffer.from(token), 
    Buffer.from(expectedToken)
  );
}

