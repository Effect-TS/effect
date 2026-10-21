/**
 * OAuth provider configuration and identity schemas for Google.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Google authentication provider definition.
   *
   * **Details**
   *
   * Google OpenID Connect with client_secret_post, account selection and offline consent. hd is a
   * consent hint; enforce Workspace policy against verified claims.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Google authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Google authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/google/provider.ts"

export {
  /**
   * Google ID-token claims, including optional Workspace hosted domain. The preset passes `hd` as a
   * consent hint; applications enforce workspace policy against this verified claim.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  GoogleUserProfile
} from "./internal/oauth/providers/google/profile.ts"
