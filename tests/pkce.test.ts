import { describe, expect, it } from "vitest";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "../src/pkce";

describe("generateCodeVerifier", () => {
  it("generates a non-empty string", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeTruthy();
    expect(typeof verifier).toBe("string");
  });

  it("generates unique values on each call", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });

  it("generates a base64url-safe string (no +, /, or =)", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).not.toMatch(/[+/=]/);
  });

  it("generates a verifier of expected length from 64 random bytes", () => {
    const verifier = generateCodeVerifier();
    // 64 bytes → base64 = 88 chars, minus padding → ~86 chars
    expect(verifier.length).toBeGreaterThanOrEqual(80);
    expect(verifier.length).toBeLessThanOrEqual(90);
  });
});

describe("generateCodeChallenge", () => {
  it("generates a challenge from a verifier", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBeTruthy();
    expect(typeof challenge).toBe("string");
  });

  it("produces a base64url-safe string", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).not.toMatch(/[+/=]/);
  });

  it("produces the same challenge for the same verifier", async () => {
    const verifier = generateCodeVerifier();
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });

  it("produces different challenges for different verifiers", async () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    const c1 = await generateCodeChallenge(v1);
    const c2 = await generateCodeChallenge(v2);
    expect(c1).not.toBe(c2);
  });

  it("generates a SHA-256 digest length (43 chars base64url)", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    // SHA-256 = 32 bytes → base64 = 44 chars, minus padding → 43 chars
    expect(challenge.length).toBe(43);
  });

  it("matches RFC 7636 Appendix B test vector", async () => {
    // Verifier from RFC 7636 Appendix B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("generateState", () => {
  it("generates a non-empty string", () => {
    const state = generateState();
    expect(state).toBeTruthy();
    expect(typeof state).toBe("string");
  });

  it("generates unique values", () => {
    const s1 = generateState();
    const s2 = generateState();
    expect(s1).not.toBe(s2);
  });

  it("generates a base64url-safe string", () => {
    const state = generateState();
    expect(state).not.toMatch(/[+/=]/);
  });
});
