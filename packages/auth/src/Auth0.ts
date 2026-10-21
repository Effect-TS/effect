/**
 * OAuth provider configuration and identity schemas for Auth0.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Returns the issuer URL for the configured Auth0 tenant.
   *
   * **Details**
   *
   * Auth0 issuer for one tenant. Auth0's discovery identifier includes the trailing slash; this
   * authentication package preserves it.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  issuer,
  /**
   * Creates a Auth0 authentication provider definition.
   *
   * **Details**
   *
   * Sign in with a customer Auth0 tenant through the shared OIDC implementation. Defaults to the
   * openid scope, client_secret_basic, S256 PKCE and advertised RS256. Auth0 can advertise RFC 9207
   * iss. The preset follows that discovery flag, and the HTTP host must still give it a distinct
   * callback. No UserInfo request or retained API access is installed. Credentials are captured when
   * the host builds its Layer; supply HttpClient and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Auth0 authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Auth0 authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/auth0/provider.ts"
