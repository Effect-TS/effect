/**
 * OAuth provider configuration and identity schemas for Figma.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Figma authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Figma through shared plain OAuth. Defaults to current_user:read, client_secret_basic,
   * and S256 PKCE. Identity is one GET to /v1/me. Figma authorization codes expire in 30 seconds.
   * Figma does not send RFC 9207 iss; the HTTP host must give it a distinct callback. No retained API
   * access is installed. Credentials are captured when the host builds its Layer; supply HttpClient
   * and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Figma authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Figma authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/figma/provider.ts"

export {
  /**
   * Documented /v1/me user object. Identity is the string user id.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  FigmaUserProfile
} from "./internal/oauth/providers/figma/profile.ts"
