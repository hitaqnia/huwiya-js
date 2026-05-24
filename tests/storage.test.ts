import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TokenStorage } from "../src/storage";
import type { StoredTokens } from "../src/types";

const mockTokens: StoredTokens = {
  accessToken: "access-123",
  refreshToken: "refresh-456",
  expiresAt: Date.now() + 3600_000,
};

beforeEach(() => {
  TokenStorage.clearAll();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  TokenStorage.clearAll();
  sessionStorage.clear();
  localStorage.clear();
});

describe("TokenStorage - memory strategy (default)", () => {
  it("stores and retrieves tokens", () => {
    TokenStorage.setStrategy("memory");
    TokenStorage.setTokens(mockTokens);

    const result = TokenStorage.getTokens();
    expect(result).toEqual(mockTokens);
  });

  it("persists refresh token in sessionStorage for page reload recovery", () => {
    TokenStorage.setStrategy("memory");
    TokenStorage.setTokens(mockTokens);

    expect(sessionStorage.getItem("huwiya_refresh_token")).toBe("refresh-456");
  });

  it("reconstructs partial tokens from refresh token after a page reload", () => {
    TokenStorage.setStrategy("memory");
    sessionStorage.setItem("huwiya_refresh_token", "stranded-refresh");

    const result = TokenStorage.getTokens();
    expect(result).toEqual({
      accessToken: "",
      refreshToken: "stranded-refresh",
      expiresAt: 0,
    });
  });

  it("returns null when no tokens are stored", () => {
    TokenStorage.setStrategy("memory");
    expect(TokenStorage.getTokens()).toBeNull();
  });

  it("clears all tokens", () => {
    TokenStorage.setStrategy("memory");
    TokenStorage.setTokens(mockTokens);
    TokenStorage.clearAll();

    expect(TokenStorage.getTokens()).toBeNull();
    expect(sessionStorage.getItem("huwiya_refresh_token")).toBeNull();
  });
});

describe("TokenStorage - sessionStorage strategy", () => {
  it("stores and retrieves tokens from sessionStorage", () => {
    TokenStorage.setStrategy("sessionStorage");
    TokenStorage.setTokens(mockTokens);

    const raw = sessionStorage.getItem("huwiya_tokens");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(mockTokens);

    const result = TokenStorage.getTokens();
    expect(result).toEqual(mockTokens);
  });

  it("clears all tokens from sessionStorage", () => {
    TokenStorage.setStrategy("sessionStorage");
    TokenStorage.setTokens(mockTokens);
    TokenStorage.clearAll();

    expect(sessionStorage.getItem("huwiya_tokens")).toBeNull();
    expect(TokenStorage.getTokens()).toBeNull();
  });
});

describe("TokenStorage - localStorage strategy", () => {
  it("stores and retrieves tokens from localStorage", () => {
    TokenStorage.setStrategy("localStorage");
    TokenStorage.setTokens(mockTokens);

    const raw = localStorage.getItem("huwiya_tokens");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(mockTokens);

    const result = TokenStorage.getTokens();
    expect(result).toEqual(mockTokens);
  });

  it("clears localStorage tokens via clearAll", () => {
    TokenStorage.setStrategy("localStorage");
    TokenStorage.setTokens(mockTokens);
    TokenStorage.clearAll();
    expect(localStorage.getItem("huwiya_tokens")).toBeNull();
  });
});

describe("TokenStorage - strategy switching", () => {
  it("clears persisted data when switching to a different strategy", () => {
    TokenStorage.setStrategy("localStorage");
    TokenStorage.setTokens(mockTokens);
    expect(localStorage.getItem("huwiya_tokens")).toBeTruthy();

    TokenStorage.setStrategy("memory");
    expect(localStorage.getItem("huwiya_tokens")).toBeNull();
    expect(TokenStorage.getTokens()).toBeNull();
  });

  it("getStrategy reports the current strategy", () => {
    TokenStorage.setStrategy("sessionStorage");
    expect(TokenStorage.getStrategy()).toBe("sessionStorage");
  });
});

describe("TokenStorage - PKCE helpers", () => {
  it("stores and retrieves code verifier", () => {
    TokenStorage.setCodeVerifier("test-verifier-123");
    expect(TokenStorage.getCodeVerifier()).toBe("test-verifier-123");
  });

  it("clears code verifier", () => {
    TokenStorage.setCodeVerifier("test-verifier-123");
    TokenStorage.clearCodeVerifier();
    expect(TokenStorage.getCodeVerifier()).toBeNull();
  });

  it("stores and retrieves state", () => {
    TokenStorage.setState("test-state-abc");
    expect(TokenStorage.getState()).toBe("test-state-abc");
  });

  it("clears state", () => {
    TokenStorage.setState("test-state-abc");
    TokenStorage.clearState();
    expect(TokenStorage.getState()).toBeNull();
  });

  it("clearAll removes code verifier and state", () => {
    TokenStorage.setCodeVerifier("verifier");
    TokenStorage.setState("state");
    TokenStorage.clearAll();

    expect(TokenStorage.getCodeVerifier()).toBeNull();
    expect(TokenStorage.getState()).toBeNull();
  });
});
