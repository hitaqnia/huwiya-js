# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-23

### Added

- Initial release. Extracted from `@hitaqnia/huwiya-react` 0.1.0 so the OAuth2 PKCE client can be reused outside of React.
- `HuwiyaClient` — OAuth2 Authorization Code Grant + PKCE client (`buildAuthorizationUrl`, `exchangeCodeForTokens`, `refreshTokens`, `logout`, `getConfig`).
- `TokenStorage` — cross-strategy token + PKCE state storage with `memory`, `sessionStorage`, and `localStorage` strategies. New `getStrategy()` accessor.
- `decodeJwt`, `extractUser` — payload decoding helpers (no signature verification).
- `generateCodeVerifier`, `generateCodeChallenge`, `generateState` — PKCE helpers built on the Web Crypto API.
- Exported types: `HuwiyaConfig`, `HuwiyaUser`, `HuwiyaAuthState`, `HuwiyaContextValue`, `StoredTokens`, `TokenResponse`, `StorageStrategy`, `JwtPayload`.
- Dual ESM/CJS build output via `tsup` with type declarations.
