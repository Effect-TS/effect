/**
 * OAuth provider configuration and identity schemas for GitLab.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a GitLab authentication provider definition.
   *
   * **Details**
   *
   * GitLab OpenID Connect, including self-hosted issuers. Preserve the exact issuer and give it a
   * distinct callback. Group membership remains application policy.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the GitLab authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the GitLab authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/gitlab/provider.ts"

export {
  /**
   * GitLab ID-token claims, including optional group membership. Group lists are application policy,
   * not local identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  GitLabUserProfile
} from "./internal/oauth/providers/gitlab/profile.ts"
