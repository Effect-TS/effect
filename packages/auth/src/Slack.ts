/**
 * OAuth provider configuration and identity schemas for Slack.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Slack authentication provider definition.
   *
   * **Details**
   *
   * Slack OpenID Connect with workspace claims and pinned discovery supplementation. Give it a
   * distinct callback. team is a consent hint; authorize workspace membership against verified claims.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Slack authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Slack authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/slack/provider.ts"

export {
  /**
   * Standard profile and workspace identifiers projected only from verified Slack ID tokens. Workspace
   * membership is application policy, not local identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SlackUserProfile
} from "./internal/oauth/providers/slack/profile.ts"
