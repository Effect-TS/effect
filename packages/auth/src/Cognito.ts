/**
 * OAuth provider configuration and identity schemas for Cognito.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Returns the issuer URL for the configured Cognito tenant.
   *
   * **Details**
   *
   * Cognito user-pool issuer. This is not the Hosted UI domain; discovery maps authorize and token
   * endpoints onto that domain.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  issuer,
  /**
   * Creates a Cognito authentication provider definition.
   *
   * **Details**
   *
   * Sign in with an Amazon Cognito user pool through the shared OIDC implementation. Defaults to the
   * openid scope, client_secret_basic, S256 PKCE and advertised RS256. Cognito supports PKCE but omits
   * it from discovery; the preset supplies that missing advertisement only for cognito-idp issuers
   * with the pool JWKS URL. Cognito does not advertise response iss; the HTTP host must give it a
   * distinct callback. No UserInfo request or retained API access is installed. Credentials are
   * captured when the host builds its Layer; supply HttpClient and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Cognito authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Cognito authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/cognito/provider.ts"
