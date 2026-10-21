/**
 * OAuth provider configuration and identity schemas for Keycloak.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Returns the issuer URL for the configured Keycloak tenant.
   *
   * **Details**
   *
   * Keycloak issuer for one realm. url is the server origin plus an optional path prefix such as /auth
   * for older deployments.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  issuer,
  /**
   * Creates a Keycloak authentication provider definition.
   *
   * **Details**
   *
   * Sign in with a customer Keycloak realm through the shared OIDC implementation. Defaults to the
   * openid scope, client_secret_basic, S256 PKCE and advertised algorithms. Keycloak advertises the
   * RFC 9207 response issuer parameter, so the preset requires it. No UserInfo request or retained API
   * access is installed. Credentials are captured when the host builds its Layer; supply HttpClient
   * and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Keycloak authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Keycloak authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/keycloak/provider.ts"
