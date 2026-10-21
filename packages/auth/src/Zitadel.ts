/**
 * OAuth provider configuration and identity schemas for Zitadel.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Returns the issuer URL for the configured Zitadel tenant.
   *
   * **Details**
   *
   * Zitadel issuer for one instance. Cloud instances use {name}.zitadel.cloud; self-hosted instances
   * use their DNS name.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  issuer,
  /**
   * Creates a Zitadel authentication provider definition.
   *
   * **Details**
   *
   * Sign in with a customer Zitadel instance through the shared OIDC implementation. Defaults to the
   * openid scope, client_secret_basic, S256 PKCE and advertised algorithms. Zitadel does not advertise
   * response iss; the HTTP host must give it a distinct callback. No UserInfo request or retained API
   * access is installed. Credentials are captured when the host builds its Layer; supply HttpClient
   * and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Zitadel authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Zitadel authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/zitadel/provider.ts"
