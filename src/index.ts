/**
 * @hitaqnia/huwiya-core — framework-agnostic OAuth2 Authorization Code Grant + PKCE
 * client for the Huwiya Identity Provider.
 *
 * Use directly from non-React code, or together with `@hitaqnia/huwiya-react` which
 * builds a React provider and hooks on top of this package.
 */

export { HuwiyaClient } from "./client";
export { TokenStorage, STORAGE_KEYS } from "./storage";
export { decodeJwt, extractUser } from "./jwt";
export {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "./pkce";

export type { JwtPayload } from "./jwt";
export type {
  HuwiyaAuthState,
  HuwiyaConfig,
  HuwiyaContextValue,
  HuwiyaUser,
  StorageStrategy,
  StoredTokens,
  TokenResponse,
} from "./types";
