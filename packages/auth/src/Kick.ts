/**
 * OAuth provider configuration and identity schemas for Kick.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Kick authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Kick through shared plain OAuth. Defaults to user:read, client_secret_post, and S256
   * PKCE. Identity is one GET to /public/v1/users with no id query, which returns the authorized user.
   * Kick does not send RFC 9207 iss; the HTTP host must give it a distinct callback. No retained API
   * access is installed. Credentials are captured when the host builds its Layer; supply HttpClient
   * and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Kick authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Kick authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/kick/provider.ts"

export {
  /**
   * Documented /public/v1/users user object. Identity is the numeric user_id.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  KickUserProfile
} from "./internal/oauth/providers/kick/profile.ts"
