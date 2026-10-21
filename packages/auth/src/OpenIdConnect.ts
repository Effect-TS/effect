/**
 * OAuth and OpenID Connect provider protocols, identity decoders, and configuration.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Layer that supplies OAuth and OpenID Connect protocols for the configured hosts. Each provider
   * defaults to generation 1, active issuance, a callback ID equal to its provider key, required
   * response issuer validation, and S256 PKCE. OpenID Connect defaults to advertised RS256, PS256,
   * ES256, or EdDSA algorithms, the `openid` scope, ID-token profile claims, and `OidcUserProfile`;
   * HS256 requires explicit selection and a client secret. Set `pkceS256` to false only for issuers
   * that cannot complete PKCE. Plain OAuth defaults to no scopes. A client secret uses
   * `client_secret_basic` unless configured otherwise. Authorization uses query callbacks unless
   * `responseMode` selects `form_post`. Discovery must confirm host capabilities; invalid
   * configuration fails while building the layer.
   *
   * **Gotchas**
   *
   * Keep retired generations until their outstanding flows expire, and never reuse a generation for
   * changed credentials or protocol configuration. The layer does not mount callback routes or infer
   * redirect URLs.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer,
  /**
   * Configuration for OAuth and OpenID Connect providers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type Options,
  /**
   * OAuth or OpenID Connect provider registration accepted by the shared sign-in protocol layer.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type Provider,
  /**
   * Declares an OIDC or OAuth provider for Http.layer. No I/O runs until its Layer builds. The HTTP
   * host supplies the provider ID and callback URLs. One initialization shares equivalent discovery
   * responses; client and verification policy remain separate for each protocol and registration.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the OpenID Connect authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the OpenID Connect authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/shared/layer.ts"

export {
  /**
   * Schema for the supported ID-token signature algorithms: RS256, PS256, ES256, EdDSA, and HS256.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  type IdTokenSignedResponseAlg,
  /**
   * JSON object codec for the claims exposed as an OpenID Connect user profile.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OidcProfileSchema,
  /**
   * Decoder that extracts a subject identifier from verified OpenID Connect claims or rejects them.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OidcSubjectDecoder,
  /**
   * Schema selecting ID-token claims alone or a profile merged with the UserInfo response.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  type OidcUserInfoMode,
  /**
   * Client authentication at the token endpoint, using a client secret, a signed assertion, or a public
   * client.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OpenIdConnectAuthentication,
  /**
   * Failure indicating invalid OpenID Connect provider or protocol configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OpenIdConnectConfigurationError,
  /**
   * Provider definitions and request timeout supplied to the shared OAuth and OpenID Connect protocol
   * layer.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OpenIdConnectOAuthProtocolOptions,
  /**
   * Plain OAuth provider endpoints, client authentication, PKCE policy, and identity lookup
   * configuration.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OpenIdConnectOAuthProvider,
  /**
   * OpenID Connect issuer, client authentication, accepted ID-token algorithms, and profile verification
   * policy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type OpenIdConnectOidcProvider,
  /**
   * Authenticated HTTP request and decoder used to obtain an identity after a plain OAuth token
   * exchange.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PlainOAuthHttpIdentitySource,
  /**
   * Verified provider subject identifier and optional public profile, without access or refresh tokens.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PlainOAuthIdentity,
  /**
   * Decoder that converts a provider response into a subject identifier and optional public profile.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PlainOAuthIdentityDecoder,
  /**
   * Identity lookup configuration using either an authenticated HTTP response or the token receipt.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PlainOAuthIdentitySource,
  /**
   * Identity decoder that reads the token receipt while keeping token material out of its result.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PlainOAuthTokenIdentitySource
} from "./internal/oauth/providers/shared/models.ts"

export {
  /**
   * Standard OpenID Connect user claims projected from verified ID tokens. Protocol claims and
   * credentials are excluded; provider assertions never authorize local account linking by themselves.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OidcStandardUserProfile,
  /**
   * Standard OpenID Connect user claims, plus Google's optional hosted domain. Generic OIDC uses this
   * schema unless a preset supplies its own. The adapter projects these from verified ID tokens,
   * optionally merged with UserInfo. Protocol claims and credentials are excluded; provider assertions
   * never authorize local account linking by themselves.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OidcUserProfile
} from "./internal/oauth/providers/shared/profile.ts"

export {
  /**
   * Creates an OAuth and OpenID Connect protocol layer for retained grants.
   *
   * **Details**
   *
   * Connected grants with the same registration/authentication defaults as OpenIdConnect.layer.
   * Profiles, resource indicators, refresh and revocation contracts remain explicit because they
   * describe the host's grant authority. Retain retired configuration generations while grants still
   * reference them.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer as layerConnected,
  /**
   * Provider definitions and request timeout for retaining and refreshing connected-account grants.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type Options as ConnectedOptions,
  /**
   * OAuth or OpenID Connect registration configured to issue and retain permission-profile grants.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type Provider as ConnectedProvider
} from "./internal/oauth/providers/shared/connected/layer.ts"

export type {
  /**
   * Plain OAuth provider configuration extended with retained-grant permission profiles.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OpenIdConnectConnectedOAuthProvider,
  /**
   * OpenID Connect provider configuration extended with retained-grant permission profiles.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OpenIdConnectConnectedOidcProvider,
  /**
   * Provider registrations and request timeout for connected-account exchange, refresh, and revocation.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OpenIdConnectConnectedProtocolOptions,
  /**
   * Policy for interpreting provider-reported refresh-token expiry, including zero and omitted values.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OpenIdConnectConnectedRefreshExpiry,
  /**
   * Provider revocation support, client authentication, token types, and the grant cohort affected by
   * revocation.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OpenIdConnectConnectedRevocation
} from "./internal/oauth/providers/shared/connected/models.ts"

export type {
  /**
   * Services required by OAuth and OpenID Connect providers.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  Requirements
} from "./internal/oauth/providers/shared/oidc.ts"
