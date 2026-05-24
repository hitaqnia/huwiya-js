import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HuwiyaClient } from "../src/client";
import { TokenStorage } from "../src/storage";
import type { HuwiyaConfig } from "../src/types";

const config: HuwiyaConfig = {
  clientId: "test-client-id",
  idpUrl: "https://idp.example.com",
  redirectUri: "https://app.example.com/callback",
  scope: "openid profile",
};

beforeEach(() => {
  TokenStorage.clearAll();
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  TokenStorage.clearAll();
  sessionStorage.clear();
  localStorage.clear();
});

describe("HuwiyaClient", () => {
  describe("constructor", () => {
    it("applies storageStrategy from config", () => {
      new HuwiyaClient({ ...config, storageStrategy: "localStorage" });
      expect(TokenStorage.getStrategy()).toBe("localStorage");
    });

    it("getConfig returns the supplied config", () => {
      const client = new HuwiyaClient(config);
      expect(client.getConfig().clientId).toBe("test-client-id");
    });
  });

  describe("buildAuthorizationUrl", () => {
    it("builds a valid authorization URL with PKCE parameters", async () => {
      const client = new HuwiyaClient(config);
      const url = await client.buildAuthorizationUrl();

      expect(url).toContain("https://idp.example.com/oauth/authorize");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("response_type=code");
      expect(url).toContain("code_challenge=");
      expect(url).toContain("code_challenge_method=S256");
      expect(url).toContain("state=");
    });

    it("stores code verifier and state in session storage", async () => {
      const client = new HuwiyaClient(config);
      await client.buildAuthorizationUrl();

      expect(TokenStorage.getCodeVerifier()).toBeTruthy();
      expect(TokenStorage.getState()).toBeTruthy();
    });

    it("includes scope in the URL", async () => {
      const client = new HuwiyaClient(config);
      const url = await client.buildAuthorizationUrl();

      expect(url).toContain("scope=openid+profile");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("throws on state mismatch", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setState("correct-state");
      TokenStorage.setCodeVerifier("test-verifier");

      await expect(
        client.exchangeCodeForTokens("auth-code", "wrong-state"),
      ).rejects.toThrow("Invalid state parameter");
    });

    it("throws when code verifier is missing", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setState("test-state");

      await expect(
        client.exchangeCodeForTokens("auth-code", "test-state"),
      ).rejects.toThrow("Missing code verifier");
    });

    it("exchanges code for tokens on successful response", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setState("test-state");
      TokenStorage.setCodeVerifier("test-verifier");

      const mockResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const tokens = await client.exchangeCodeForTokens("auth-code", "test-state");

      expect(tokens.accessToken).toBe("new-access-token");
      expect(tokens.refreshToken).toBe("new-refresh-token");
      expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    });

    it("clears the verifier and state after a successful exchange", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setState("test-state");
      TokenStorage.setCodeVerifier("test-verifier");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "a",
            refresh_token: "r",
            token_type: "Bearer",
            expires_in: 60,
          }),
          { status: 200 },
        ),
      );

      await client.exchangeCodeForTokens("auth-code", "test-state");
      expect(TokenStorage.getCodeVerifier()).toBeNull();
      expect(TokenStorage.getState()).toBeNull();
    });

    it("throws on failed token exchange", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setState("test-state");
      TokenStorage.setCodeVerifier("test-verifier");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Bad Request", { status: 400 }),
      );

      await expect(
        client.exchangeCodeForTokens("auth-code", "test-state"),
      ).rejects.toThrow("Token exchange failed: 400");
    });
  });

  describe("refreshTokens", () => {
    it("throws when no refresh token is available", async () => {
      const client = new HuwiyaClient(config);

      await expect(client.refreshTokens()).rejects.toThrow("No refresh token available");
    });

    it("refreshes tokens successfully", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setTokens({
        accessToken: "old-access",
        refreshToken: "old-refresh",
        expiresAt: Date.now() + 1000,
      });

      const mockResponse = {
        access_token: "refreshed-access",
        refresh_token: "refreshed-refresh",
        token_type: "Bearer",
        expires_in: 3600,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const tokens = await client.refreshTokens();
      expect(tokens.accessToken).toBe("refreshed-access");
      expect(tokens.refreshToken).toBe("refreshed-refresh");
    });

    it("clears storage on failed refresh", async () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setTokens({
        accessToken: "old-access",
        refreshToken: "old-refresh",
        expiresAt: Date.now() + 1000,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401 }),
      );

      await expect(client.refreshTokens()).rejects.toThrow("Token refresh failed: 401");
      expect(TokenStorage.getTokens()).toBeNull();
    });
  });

  describe("logout", () => {
    it("clears all stored tokens", () => {
      const client = new HuwiyaClient(config);
      TokenStorage.setTokens({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: Date.now() + 1000,
      });

      const originalLocation = window.location;
      // @ts-expect-error - overriding readonly property for test
      delete window.location;
      window.location = { ...originalLocation, href: "" } as Location;

      client.logout();

      expect(TokenStorage.getTokens()).toBeNull();

      window.location = originalLocation;
    });

    it("redirects to postLogoutRedirectUri when configured", () => {
      const configWithLogout: HuwiyaConfig = {
        ...config,
        postLogoutRedirectUri: "https://app.example.com",
      };
      const client = new HuwiyaClient(configWithLogout);

      const originalLocation = window.location;
      // @ts-expect-error - overriding readonly property for test
      delete window.location;
      window.location = { ...originalLocation, href: "" } as Location;

      client.logout();

      expect(window.location.href).toBe("https://app.example.com");

      window.location = originalLocation;
    });
  });
});
