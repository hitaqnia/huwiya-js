/**
 * PKCE (RFC 7636) helpers for the OAuth2 Authorization Code Grant.
 *
 * These helpers rely on the Web Crypto API (`globalThis.crypto`) and are
 * intended to run in browsers or any modern JavaScript runtime that ships
 * WebCrypto (Node 18+, Deno, Bun, Workers, etc).
 */

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a high-entropy PKCE code verifier (~86 base64url characters from
 * 64 random bytes).
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

/**
 * Generate the S256 code challenge corresponding to a code verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

/**
 * Generate a cryptographically random state value used for CSRF protection.
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}
