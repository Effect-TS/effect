/**
 * OAuth provider configuration and identity schemas for X.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a X authentication provider definition.
   *
   * **Details**
   *
   * Sign in with X through shared plain OAuth. Defaults to users.read and tweet.read,
   * client_secret_basic, and S256 PKCE. Identity is one GET to /2/users/me. Request users.email for
   * confirmed_email. Request offline.access only when a later connected grant needs refresh. X does
   * not send RFC 9207 iss; the HTTP host must give it a distinct callback. No retained API access is
   * installed. Credentials are captured when the host builds its Layer; supply HttpClient and crypto
   * in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the X authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the X authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/x/provider.ts"

export {
  /**
   * Documented /2/users/me user object. Identity is the string user id. Email is confirmed_email and
   * only present when users.email was granted.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  XUserProfile
} from "./internal/oauth/providers/x/profile.ts"
