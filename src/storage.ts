import type { StorageStrategy, StoredTokens } from "./types";

const KEYS = {
  tokens: "huwiya_tokens",
  refreshToken: "huwiya_refresh_token",
  codeVerifier: "huwiya_code_verifier",
  state: "huwiya_state",
} as const;

/**
 * In-memory store for the access token (not persisted to any storage API).
 * This prevents XSS attacks from exfiltrating access tokens.
 */
let inMemoryTokens: StoredTokens | null = null;

let currentStrategy: StorageStrategy = "memory";

function getStorage(): Storage {
  return currentStrategy === "localStorage" ? localStorage : sessionStorage;
}

/**
 * Cross-strategy token + PKCE storage used by {@link HuwiyaClient}. The
 * strategy is a module-global so a single client instance owns the persisted
 * state for the page — call {@link TokenStorage.setStrategy} once during
 * client construction.
 */
export const TokenStorage = {
  /**
   * Configure the storage strategy. Switching strategies clears any data
   * previously persisted under the old strategy.
   */
  setStrategy(strategy: StorageStrategy): void {
    if (strategy !== currentStrategy) {
      TokenStorage.clearAll();
    }
    currentStrategy = strategy;
  },

  /** Read the current strategy — primarily useful for tests. */
  getStrategy(): StorageStrategy {
    return currentStrategy;
  },

  getTokens(): StoredTokens | null {
    if (currentStrategy === "memory") {
      // Access token lives in memory; refresh token in sessionStorage
      if (inMemoryTokens) {
        return inMemoryTokens;
      }
      // Try to reconstruct from sessionStorage refresh token (e.g., after page reload)
      try {
        const refreshToken = sessionStorage.getItem(KEYS.refreshToken);
        if (refreshToken) {
          // Return partial tokens so the caller knows to attempt a refresh
          return { accessToken: "", refreshToken, expiresAt: 0 };
        }
      } catch {
        // sessionStorage not available
      }
      return null;
    }

    try {
      const raw = getStorage().getItem(KEYS.tokens);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setTokens(tokens: StoredTokens): void {
    if (currentStrategy === "memory") {
      inMemoryTokens = tokens;
      // Persist only the refresh token in sessionStorage for page reload recovery
      try {
        sessionStorage.setItem(KEYS.refreshToken, tokens.refreshToken);
      } catch {
        // sessionStorage not available
      }
      return;
    }

    getStorage().setItem(KEYS.tokens, JSON.stringify(tokens));
  },

  clearTokens(): void {
    inMemoryTokens = null;
    try {
      sessionStorage.removeItem(KEYS.refreshToken);
    } catch {
      // sessionStorage not available
    }
    try {
      localStorage.removeItem(KEYS.tokens);
      sessionStorage.removeItem(KEYS.tokens);
    } catch {
      // storage not available
    }
  },

  getCodeVerifier(): string | null {
    return sessionStorage.getItem(KEYS.codeVerifier);
  },

  setCodeVerifier(verifier: string): void {
    sessionStorage.setItem(KEYS.codeVerifier, verifier);
  },

  clearCodeVerifier(): void {
    sessionStorage.removeItem(KEYS.codeVerifier);
  },

  getState(): string | null {
    return sessionStorage.getItem(KEYS.state);
  },

  setState(state: string): void {
    sessionStorage.setItem(KEYS.state, state);
  },

  clearState(): void {
    sessionStorage.removeItem(KEYS.state);
  },

  clearAll(): void {
    inMemoryTokens = null;
    try {
      sessionStorage.removeItem(KEYS.tokens);
      sessionStorage.removeItem(KEYS.refreshToken);
      sessionStorage.removeItem(KEYS.codeVerifier);
      sessionStorage.removeItem(KEYS.state);
    } catch {
      // sessionStorage not available
    }
    try {
      localStorage.removeItem(KEYS.tokens);
    } catch {
      // localStorage not available
    }
  },
};

/** Internal storage keys — exported for advanced use / testing. */
export const STORAGE_KEYS = KEYS;
