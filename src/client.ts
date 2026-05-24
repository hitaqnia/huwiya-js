import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";
import { TokenStorage } from "./storage";
import type { HuwiyaConfig, StoredTokens, TokenResponse } from "./types";

/**
 * Framework-agnostic OAuth2 Authorization Code Grant + PKCE client for the
 * Huwiya Identity Provider. Use this directly from non-React code (Vue,
 * Svelte, vanilla JS, Node tools, etc.) or via the `@hitaqnia/huwiya-react` provider.
 */
export class HuwiyaClient {
  private config: HuwiyaConfig;

  constructor(config: HuwiyaConfig) {
    this.config = config;
    if (config.storageStrategy) {
      TokenStorage.setStrategy(config.storageStrategy);
    }
  }

  /** Read the current effective configuration. */
  getConfig(): Readonly<HuwiyaConfig> {
    return this.config;
  }

  /**
   * Build the authorization URL for the OAuth2 redirect. Stores the PKCE
   * verifier and state in `sessionStorage` so {@link exchangeCodeForTokens}
   * can complete the flow after the IDP redirects back.
   */
  async buildAuthorizationUrl(): Promise<string> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    TokenStorage.setCodeVerifier(codeVerifier);
    TokenStorage.setState(state);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope ?? "",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${this.config.idpUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange an authorization code (returned by the IDP redirect) for access
   * and refresh tokens. Validates the state parameter to defend against CSRF.
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<StoredTokens> {
    const savedState = TokenStorage.getState();
    if (!savedState || savedState !== state) {
      throw new Error("Invalid state parameter. Possible CSRF attack.");
    }

    const codeVerifier = TokenStorage.getCodeVerifier();
    if (!codeVerifier) {
      throw new Error("Missing code verifier. Please restart the login flow.");
    }

    const response = await fetch(`${this.config.idpUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
        code,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${body}`);
    }

    const data: TokenResponse = await response.json();

    TokenStorage.clearCodeVerifier();
    TokenStorage.clearState();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    TokenStorage.setTokens(tokens);
    return tokens;
  }

  /**
   * Use the persisted refresh token to obtain a fresh access (and possibly
   * refresh) token from the IDP. Clears storage on failure so the caller can
   * prompt the user to log in again.
   */
  async refreshTokens(): Promise<StoredTokens> {
    const current = TokenStorage.getTokens();
    if (!current?.refreshToken) {
      throw new Error("No refresh token available.");
    }

    const response = await fetch(`${this.config.idpUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        refresh_token: current.refreshToken,
        scope: this.config.scope ?? "",
      }),
    });

    if (!response.ok) {
      TokenStorage.clearAll();
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data: TokenResponse = await response.json();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    TokenStorage.setTokens(tokens);
    return tokens;
  }

  /**
   * Clear all tokens and PKCE state. If `postLogoutRedirectUri` was provided
   * in the config, navigate the browser there.
   */
  logout(): void {
    TokenStorage.clearAll();
    if (this.config.postLogoutRedirectUri && typeof window !== "undefined") {
      window.location.href = this.config.postLogoutRedirectUri;
    }
  }
}
