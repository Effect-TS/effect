/**
 * OAuth provider configuration and identity schemas for Okta.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Returns the issuer URL for the configured Okta tenant.
   *
   * **Details**
   *
   * Okta issuer for one customer. Defaults to the default custom authorization server. Pass
   * authorizationServer "org" for the org authorization server.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  issuer,
  /**
   * Creates a Okta authentication provider definition.
   *
   * **Details**
   *
   * Sign in with a customer Okta org through the shared OIDC implementation. Defaults to the openid
   * scope, client_secret_basic, S256 PKCE and advertised RS256. Okta does not advertise response iss;
   * the HTTP host must give it a distinct callback. No UserInfo request or retained API access is
   * installed. Credentials are captured when the host builds its Layer; supply HttpClient and crypto
   * in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Okta authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Okta authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/okta/provider.ts"
