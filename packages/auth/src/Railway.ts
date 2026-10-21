/**
 * OAuth provider configuration and identity schemas for Railway.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Railway authentication provider definition.
   *
   * **Details**
   *
   * Railway OpenID Connect. Discovery is fetched from the published `/oauth` document. Verification
   * keeps issuer `https://backboard.railway.com`. ID tokens omit name, email, and picture, so the
   * preset merges UserInfo. Response iss stays required.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Railway authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Railway authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/railway/provider.ts"

export {
  /**
   * Standard profile plus Railway session id. Railway ID tokens omit name, email and picture; the
   * preset merges UserInfo after verification.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  RailwayUserProfile
} from "./internal/oauth/providers/railway/profile.ts"
