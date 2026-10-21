/**
 * OAuth provider configuration and identity schemas for Atlassian.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Atlassian authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Atlassian through shared plain OAuth. Defaults to read:me, client_secret_post, S256
   * PKCE, audience=api.atlassian.com, and prompt=consent. Identity is one GET to /me. Request
   * offline_access only when a later connected grant needs refresh. Site cloud IDs come from
   * accessible-resources, not this identity call. Atlassian does not send RFC 9207 iss; the HTTP host
   * must give it a distinct callback. No retained API access is installed. Credentials are captured
   * when the host builds its Layer; supply HttpClient and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Atlassian authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Atlassian authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/atlassian/provider.ts"

export {
  /**
   * Documented /me user object. Identity is account_id. Site access is a separate GET to
   * /oauth/token/accessible-resources after the application retains a grant.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AtlassianUserProfile
} from "./internal/oauth/providers/atlassian/profile.ts"
