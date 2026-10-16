/**
 * Shared inputs and private results for scoped OAuth provider clients.
 * Applications own callback state and issuer validation, single-use transactions,
 * account lookup, and session issuance.
 *
 * @stability unstable
 * @since 4.1.0
 */
import type * as Duration from "effect/Duration"
import type * as Redacted from "effect/Redacted"

import type * as OAuth from "./OAuth.ts"
import * as Generated from "./providers/internal/generated/openid.ts"

/**
 * Client credentials, one exact registered callback, and request bounds for a provider client.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options {
  readonly clientId: string
  readonly clientSecret: Redacted.Redacted<string>
  readonly redirectUri: string
  /**
   * Defaults to 10 seconds. Numeric inputs are milliseconds.
   */
  readonly timeout?: Duration.Input
  readonly maxResponseBytes?: number
}

/**
 * Private transaction state and an S256 challenge for an authorization URL.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput {
  readonly state: Redacted.Redacted<string>
  readonly codeChallenge: string
  readonly prompt?: OAuth.AuthorizationInput["prompt"]
  readonly loginHint?: string
}

/**
 * Authorization inputs with the nonce and optional authentication age saved in the transaction.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface OidcAuthorizationInput extends AuthorizationInput {
  readonly nonce: Redacted.Redacted<string>
  readonly maxAge?: Duration.Input
}

/**
 * A single-use authorization code and its original PKCE verifier, after callback validation.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExchangeInput {
  readonly code: Redacted.Redacted<string>
  readonly pkceVerifier: Redacted.Redacted<string>
}

/**
 * Code exchange inputs with the original nonce and authentication age from the saved transaction.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface OidcExchangeInput extends ExchangeInput {
  readonly nonce: Redacted.Redacted<string>
  readonly maxAge?: Duration.Input
}

/**
 * Provider identity with a private, validated profile. Use both issuer and subject for account lookup.
 *
 * **Gotchas**
 *
 * Profile email addresses and display names do not authorize account linking.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Identity<Profile> {
  readonly issuer: string
  readonly subject: string
  readonly profile: Redacted.Redacted<Profile>
}

/**
 * A validated provider identity, normalized tokens, and the original private token receipt.
 *
 * **Gotchas**
 *
 * An exchange can consume its code before a later request or verification fails.
 * Failure does not authorize retrying the exchange.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExchangeResult<Profile> {
  readonly receipt: OAuth.TokenReceipt
  readonly tokens: OAuth.TokenSet
  readonly identity: Identity<Profile>
}

/**
 * Schema for standard OpenID Connect profile claims, without protocol claims or credentials.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const StandardProfile = Generated.Profile

/**
 * Value described by the StandardProfile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type StandardProfile = typeof StandardProfile.Type
