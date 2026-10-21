/**
 * OAuth provider configuration and identity schemas for Vercel.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Vercel authentication provider definition.
   *
   * **Details**
   *
   * Vercel OpenID Connect with optional offline_access consent. Give this issuer a distinct callback
   * because it does not advertise response iss.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Vercel authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Vercel authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/vercel/provider.ts"

export {
  /**
   * Schema for the OpenID Connect claims accepted from Vercel.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  VercelUserProfile
} from "./internal/oauth/providers/vercel/profile.ts"
