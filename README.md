# @hitaqnia/core

Framework-agnostic OAuth2 Authorization Code Grant + PKCE client for the [Huwiya Identity Provider](https://github.com/hitaqnia/huwiya-backend). Use directly from non-React code (Vue, Svelte, vanilla JS, Node tools, etc.) or together with [`@hitaqnia/react`](https://github.com/hitaqnia/huwiya-react), which builds React bindings on top of this package.

## Installation

```bash
npm install @hitaqnia/core
```

## Quick Start

```ts
import { HuwiyaClient } from "@hitaqnia/core";

const client = new HuwiyaClient({
  clientId: "your-client-id",
  idpUrl: "https://your-huwiya-instance.com",
  redirectUri: "http://localhost:3000/callback",
  scope: "openid profile",
  storageStrategy: "memory", // "memory" | "sessionStorage" | "localStorage"
});

// 1. Send the user to the IDP
window.location.href = await client.buildAuthorizationUrl();

// 2. Back on /callback, exchange the code
const url = new URL(window.location.href);
const tokens = await client.exchangeCodeForTokens(
  url.searchParams.get("code")!,
  url.searchParams.get("state")!,
);

// 3. Use the access token
fetch("/api/me", {
  headers: { Authorization: `Bearer ${tokens.accessToken}` },
});

// 4. Refresh when needed
const refreshed = await client.refreshTokens();

// 5. Log the user out
client.logout();
```

## Configuration

| Property | Type | Required | Description |
|---|---|---|---|
| `clientId` | `string` | Yes | OAuth2 client ID |
| `idpUrl` | `string` | Yes | Base URL of the Huwiya IDP (no trailing slash) |
| `redirectUri` | `string` | Yes | OAuth2 callback URL |
| `scope` | `string` | No | OAuth2 scopes (space separated) |
| `postLogoutRedirectUri` | `string` | No | Redirect URL after `logout()` |
| `storageStrategy` | `"memory" \| "sessionStorage" \| "localStorage"` | No | Token storage strategy (default `"memory"`) |

### Storage strategies

- **`memory`** (default, recommended) — Access token in memory, refresh token in `sessionStorage`. Survives page reloads via silent refresh. Best XSS protection.
- **`sessionStorage`** — Both tokens in `sessionStorage`. Tab-scoped, cleared on browser close.
- **`localStorage`** — Both tokens in `localStorage`. Persistent across tabs and browser restarts. More vulnerable to XSS.

## API

### `HuwiyaClient`

| Method | Returns | Description |
|---|---|---|
| `new HuwiyaClient(config)` | `HuwiyaClient` | Construct a client. If `config.storageStrategy` is set, it is applied to the module-global `TokenStorage`. |
| `client.getConfig()` | `Readonly<HuwiyaConfig>` | Read the active configuration. |
| `client.buildAuthorizationUrl()` | `Promise<string>` | Generate a PKCE verifier + challenge, store them, and return the `/oauth/authorize` URL to redirect to. |
| `client.exchangeCodeForTokens(code, state)` | `Promise<StoredTokens>` | Validate the state, swap the auth code for tokens, persist them. |
| `client.refreshTokens()` | `Promise<StoredTokens>` | Use the stored refresh token to fetch a new access (and possibly refresh) token. Clears storage on failure. |
| `client.logout()` | `void` | Clear all tokens and PKCE state. Navigates to `postLogoutRedirectUri` if configured. |

### `TokenStorage`

Cross-strategy storage used by `HuwiyaClient`. The strategy is a module-global, so a single client instance owns the persisted state for the page.

```ts
import { TokenStorage } from "@hitaqnia/core";

TokenStorage.setStrategy("localStorage");
TokenStorage.getTokens();   // StoredTokens | null
TokenStorage.setTokens(t);
TokenStorage.clearAll();
TokenStorage.getCodeVerifier();
TokenStorage.setCodeVerifier(v);
TokenStorage.getState();
TokenStorage.setState(s);
```

### JWT helpers

```ts
import { decodeJwt, extractUser } from "@hitaqnia/core";

const payload = decodeJwt(token); // JwtPayload | null — payload only, no verification
const user = extractUser(token);  // HuwiyaUser | null  — { id, phone, name, scopes }
```

> **Note.** `decodeJwt` does not verify the JWT signature. Signature verification is the responsibility of the resource server.

### PKCE helpers

```ts
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@hitaqnia/core";

const verifier  = generateCodeVerifier();           // 64 random bytes → base64url
const challenge = await generateCodeChallenge(v);   // SHA-256(verifier) → base64url
const state     = generateState();                  // 32 random bytes → base64url
```

## Exported types

```ts
import type {
  HuwiyaConfig,
  HuwiyaUser,
  HuwiyaAuthState,
  HuwiyaContextValue,
  StoredTokens,
  TokenResponse,
  StorageStrategy,
  JwtPayload,
} from "@hitaqnia/core";
```

## Runtime requirements

`@hitaqnia/core` uses the Web Crypto API (`globalThis.crypto`) and the Fetch API. These are available in all modern browsers, Node 18+, Deno, Bun, and Workers runtimes.

The storage helpers assume `sessionStorage` / `localStorage` are available — i.e. they run in a browser-like environment. For non-browser usage you can call `HuwiyaClient` directly without touching storage.

## Development

```bash
npm install
npm run build
npm run test
npm run dev     # tsup watch mode
```

## License

MIT
