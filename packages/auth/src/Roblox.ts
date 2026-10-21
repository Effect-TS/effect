/**
 * OAuth provider configuration and identity schemas for Roblox.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Roblox authentication provider definition.
   *
   * **Details**
   *
   * Roblox OpenID Connect. The issuer keeps its trailing slash. Roblox documents S256 PKCE but omits
   * it from discovery, so the preset supplies that advertisement. Roblox does not advertise response
   * iss. Third-party apps do not receive email.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Roblox authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Roblox authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/roblox/provider.ts"

export {
  /**
   * Standard profile plus Roblox account metadata from verified ID tokens. Third-party apps do not
   * receive email. Usernames are not durable identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  RobloxUserProfile
} from "./internal/oauth/providers/roblox/profile.ts"
