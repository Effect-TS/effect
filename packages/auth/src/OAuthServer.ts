/**
 * OAuth and OpenID Connect authorization servers with durable grants, consent, and resource access verification.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates an OAuth authorization server.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  make,
  /**
   * Creates an OpenID Connect authorization server.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  makeOpenId,
  /**
   * Application identity source for an OpenID Connect authorization server.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type OpenIdIdentity,
  /**
   * Configuration for an OpenID Connect authorization server.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type OpenIdOptions,
  /**
   * Configuration for the module.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type Options
} from "./internal/oauth/server/server.ts"

export {
  /**
   * Schema and type for an application authorization decision.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OpenIdAuthorizationResult
} from "./internal/oauth/server/authorization.ts"
export {
  /**
   * Validated context passed to the consent renderer.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type Consent,
  /**
   * Service that renders an authorization consent response.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  ConsentRenderer,
  /**
   * Service that checks prior consent for an OpenID Connect request.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OpenIdConsent
} from "./internal/oauth/server/consent.ts"
export {
  /**
   * Active private signing key and trusted public keys for issued tokens.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type IdentitySigningKeys
} from "./internal/oauth/server/openid.ts"

export {
  /**
   * Trusted issuer, resource, public keys, and optional scope declarations.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  type AccessTokenVerifierOptions,
  /**
   * Creates an offline verifier for signed OAuth access tokens.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  makeAccessTokenVerifier
} from "./internal/oauth/server/accessToken.ts"

export {
  /**
   * Schema and type for a verified OAuth access grant.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Access,
  /**
   * Schema and type for application claims in an access grant.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  AccessClaims,
  /**
   * Schema and type for a consumed client assertion identifier.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  AssertionReceipt,
  /**
   * Schema and type for browser authentication bound to an authorization.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Authentication,
  /**
   * Schema and type for a registered client.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Client,
  /**
   * Error indicating invalid module configuration.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  ConfigurationError,
  /**
   * Service containing verified access for the current request.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  CurrentAccess,
  /**
   * Error indicating an invalid or expired access token.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  InvalidToken,
  /**
   * Schema and type for supported OpenID Connect profile claims.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OpenIdProfile,
  /**
   * Service that persists module state and atomic transitions.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Persistence,
  /**
   * Schema and type for durable module state.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Record,
  /**
   * Error indicating unavailable authentication infrastructure.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  Unavailable
} from "./internal/oauth/server/models.ts"
