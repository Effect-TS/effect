/**
 * OAuth provider configuration and identity schemas for Zoom.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Zoom authentication provider definition.
   *
   * **Details**
   *
   * Zoom OpenID Connect with standard claims and required response issuer validation.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Zoom authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Zoom authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/zoom/provider.ts"

export {
  /**
   * Schema for the OpenID Connect claims accepted from Zoom.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ZoomUserProfile
} from "./internal/oauth/providers/zoom/profile.ts"
