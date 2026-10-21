/**
 * OAuth provider configuration and identity schemas for Linear.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Decodes linear IDentity from the provider response.
   *
   * @stability unstable
   * @category decoding
   * @since 4.1.0
   */
  decodeLinearIdentity,
  /**
   * Linear provider key.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  linearProviderKey,
  /**
   * Creates a Linear authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Linear through shared plain OAuth. Identity is GraphQL viewer over POST. Authorize
   * scopes are comma-separated. PKCE S256 is sent. Token exchange uses client_secret_post so the
   * authorization-code body includes client id and secret. Linear does not advertise RFC 9207 iss; the
   * HTTP host must give it a distinct callback. No retained API access is installed. Credentials are
   * captured when the host builds its Layer; supply HttpClient and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Linear authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Linear authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/linear/provider.ts"

export {
  /**
   * GraphQL viewer fields used for Linear sign-in. The numeric-looking id is a Linear user id; email
   * is not treated as verified.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LinearUserProfile
} from "./internal/oauth/providers/linear/profile.ts"
