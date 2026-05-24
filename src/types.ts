/**
 * Configuration options for the Huwiya OAuth2 PKCE client.
 */
export interface HuwiyaConfig {
  /** OAuth2 client ID issued by the Huwiya IDP. */
  clientId: string;
  /** Base URL of the Huwiya identity provider (no trailing slash). */
  idpUrl: string;
  /** Registered OAuth2 redirect URI for the authorization code callback. */
  redirectUri: string;
  /** Optional OAuth2 scopes (space separated). */
  scope?: string;
  /** Optional URL to navigate to after a successful logout. */
  postLogoutRedirectUri?: string;
  /**
   * Token storage strategy. Defaults to "memory" for better security.
   * - "memory": Access token in memory, refresh token in sessionStorage (recommended)
   * - "sessionStorage": Both tokens in sessionStorage (tab-scoped, cleared on browser close)
   * - "localStorage": Both tokens in localStorage (persistent, vulnerable to XSS)
   */
  storageStrategy?: StorageStrategy;
}

/**
 * Token storage strategies supported by {@link TokenStorage}.
 */
export type StorageStrategy = "memory" | "sessionStorage" | "localStorage";

/**
 * Raw token response returned by the Huwiya OAuth2 `/oauth/token` endpoint.
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Tokens as persisted by the SDK after a successful exchange or refresh.
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch milliseconds at which the access token expires. */
  expiresAt: number;
}

/**
 * Decoded user information extracted from a Huwiya JWT access token.
 */
export interface HuwiyaUser {
  id: string;
  phone: string;
  name: string;
  scopes: string[];
}

/**
 * Snapshot of the auth state surfaced by a {@link HuwiyaContextValue}.
 */
export interface HuwiyaAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: HuwiyaUser | null;
  error: string | null;
}

/**
 * Full context value exposed by the React provider. Lives here in core so
 * other UI frameworks can share the same shape, but the React package is the
 * primary consumer.
 */
export interface HuwiyaContextValue extends HuwiyaAuthState {
  login: () => void;
  logout: () => void;
  handleCallback: () => Promise<void>;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  refresh: () => Promise<void>;
}
