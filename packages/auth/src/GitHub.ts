/**
 * OAuth provider configuration and identity schemas for GitHub.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * GitHub OAuth app registrations and transport settings for retaining connected-account grants.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type ConnectedOptions,
  /**
   * GitHub OAuth app registration with the permission profiles it can issue.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type ConnectedRegistration,
  /**
   * Creates a GitHub OAuth app sign-in protocol layer.
   *
   * **Details**
   *
   * GitHub OAuth sign-in. Defaults to callback ID github, generation 1, active issuance and a
   * 10-second request timeout. Does not install HTTP routes. For rotation, provide registrations with
   * one active generation and retain retired generations through their issued flows' lifetime.
   * Configuration is validated when the Layer builds; existing protocol safety rules still apply.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer,
  /**
   * Creates a GitHub OAuth app protocol layer for retained grants.
   *
   * **Details**
   *
   * Configure GitHub API connections with the same callback/rotation defaults as layer. Permission
   * profiles remain explicit; connection grants are not logins.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layerConnected,
  /**
   * Configuration for GitHub authentication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type Options,
  /**
   * Declares GitHub for Http.layer. The host supplies its provider key and callback destinations.
   * Retired registrations remain available to finish flows. Invalid registrations fail configure with
   * OpenIdConnectConfigurationError.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the GitHub authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the GitHub authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration,
  /**
   * GitHub.com OAuth App credentials and one or more exact callback destinations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type Registration
} from "./internal/oauth/providers/github/provider.ts"

export {
  /**
   * GitHub registration generations, permission profiles, and request timeout for connected-account
   * protocols.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type GitHubOAuthAppConnectedProtocolOptions,
  /**
   * GitHub.com OAuth App credentials, distinct from GitHub App installation or user tokens.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type GitHubOAuthAppGeneration,
  /**
   * GitHub registration generations and request timeout for sign-in protocols.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type GitHubOAuthAppProtocolOptions
} from "./internal/oauth/providers/github/models.ts"

export {
  /**
   * Failure indicating invalid OpenID Connect provider or protocol configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OpenIdConnectConfigurationError
} from "./internal/oauth/providers/shared/models.ts"

export {
  /**
   * Creates a GitHub OAuth app provider registration.
   *
   * **Details**
   *
   * A GitHub.com OAuth App generation for the same provider list as generic OIDC. Retains GitHub
   * receipt/error rules. Requests read:user, plus user:email only when verifiedPrimaryEmail is
   * enabled; no repository access is requested. Construction performs no I/O; invalid configuration
   * throws the typed configuration error.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  gitHubOAuthAppProvider
} from "./internal/oauth/providers/github/protocol.ts"

export {
  /**
   * Creates a provider access profile for retained OAuth permissions.
   *
   * **Details**
   *
   * Provider API permissions and token retention, supplied to OAuth.make({ access }).
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  accessProfile
} from "./internal/oauth/providers/github/access.ts"
export {
  /**
   * Git hub OAuth app provider key.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  gitHubOAuthAppProviderKey
} from "./internal/oauth/providers/github/models.ts"
export {
  /**
   * All documented GitHub /user fields, with provider spelling and nulls retained. Only the numeric ID
   * establishes identity. Other fields are optional because availability differs by permission and
   * provider response. This does not fetch repositories, email lists, or any additional endpoint.
   * Unknown fields are omitted. URLs are metadata, not approved redirect or server-fetch targets.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  GitHubUserProfile
} from "./internal/oauth/providers/github/profile.ts"
