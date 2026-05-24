import type { HuwiyaUser } from "./types";

/**
 * Decoded payload of a Huwiya access token.
 */
export interface JwtPayload {
  sub: string;
  phone: string;
  name: string;
  scopes: string[];
  exp: number;
  iat: number;
  [key: string]: unknown;
}

/**
 * Decode a JWT payload **without verifying its signature**. Signature
 * verification is the responsibility of the resource server — clients should
 * use this only to read claims for UI purposes.
 *
 * Returns `null` if the input is not a well-formed JWT.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract a {@link HuwiyaUser} from a Huwiya JWT access token. Missing string
 * claims default to empty values so callers can render safely.
 */
export function extractUser(token: string): HuwiyaUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    phone: payload.phone ?? "",
    name: payload.name ?? "",
    scopes: payload.scopes ?? [],
  };
}
