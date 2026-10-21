/**
 * OAuth provider configuration and identity schemas for Apple.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Mints the ES256 client-secret JWT Apple requires at the token endpoint. Lifetime defaults to 5
   * minutes and cannot exceed 6 months (15,777,000 seconds).
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  mintClientSecret,
  /**
   * Creates a Apple authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Apple through the shared OIDC implementation. Defaults to the openid scope,
   * client_secret_post, form_post callbacks, advertised RS256, and no PKCE. AppleUserProfile decodes
   * boolean or string email_verified / is_private_email flags. Name arrives once in the user form
   * field on first consent and is merged into that profile. No UserInfo request or retained API access
   * is installed. Credentials are captured when the host builds its Layer; supply HttpClient and
   * crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Apple authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Apple authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/apple/provider.ts"

export {
  /**
   * Sign in with Apple ID-token claims. `email_verified` and `is_private_email` arrive as booleans or
   * the strings "true" and "false". Name is not in the ID token; it arrives once in the `user` form
   * field and is merged before this schema.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AppleUserProfile
} from "./internal/oauth/providers/apple/profile.ts"
