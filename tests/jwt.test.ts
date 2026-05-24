import { describe, expect, it } from "vitest";
import { decodeJwt, extractUser } from "../src/jwt";

function encodePayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `eyJhbGciOiJSUzI1NiJ9.${base64}.fake-signature`;
}

describe("decodeJwt", () => {
  it("decodes a valid JWT payload", () => {
    const payload = { sub: "123", name: "Test User", phone: "+966500000000", scopes: ["read"], exp: 9999999999, iat: 1000000000 };
    const token = encodePayload(payload);
    const result = decodeJwt(token);

    expect(result).not.toBeNull();
    expect(result!.sub).toBe("123");
    expect(result!.name).toBe("Test User");
    expect(result!.phone).toBe("+966500000000");
    expect(result!.scopes).toEqual(["read"]);
  });

  it("preserves custom claims via the index signature", () => {
    const payload = { sub: "1", name: "x", phone: "y", scopes: [], exp: 1, iat: 1, tenantId: "abc" };
    const token = encodePayload(payload);
    const result = decodeJwt(token);
    expect(result!.tenantId).toBe("abc");
  });

  it("returns null for an invalid token", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
  });

  it("returns null for a token with only two parts", () => {
    expect(decodeJwt("part1.part2")).toBeNull();
  });

  it("returns null for a token with invalid base64 payload", () => {
    expect(decodeJwt("header.!!!invalid-base64!!!.signature")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeJwt("")).toBeNull();
  });
});

describe("extractUser", () => {
  it("extracts user from a valid token", () => {
    const payload = { sub: "user-1", name: "Mahdi", phone: "+966511111111", scopes: ["admin", "read"], exp: 9999999999, iat: 1000000000 };
    const token = encodePayload(payload);
    const user = extractUser(token);

    expect(user).toEqual({
      id: "user-1",
      name: "Mahdi",
      phone: "+966511111111",
      scopes: ["admin", "read"],
    });
  });

  it("returns null for an invalid token", () => {
    expect(extractUser("garbage")).toBeNull();
  });

  it("defaults missing fields to empty values", () => {
    const payload = { sub: "user-2", exp: 9999999999, iat: 1000000000 };
    const token = encodePayload(payload);
    const user = extractUser(token);

    expect(user).toEqual({
      id: "user-2",
      name: "",
      phone: "",
      scopes: [],
    });
  });
});
