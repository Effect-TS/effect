/**
 * OAuth provider configuration and identity schemas for Notion.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Decodes notion IDentity from the provider response.
   *
   * @stability unstable
   * @category decoding
   * @since 4.1.0
   */
  decodeNotionIdentity,
  /**
   * Notion provider key.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  notionProviderKey,
  /**
   * Creates a Notion authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Notion through shared plain OAuth. Identity is owner.user on the token response.
   * Token requests use HTTP Basic and JSON bodies. PKCE is not sent. Notion does not advertise RFC
   * 9207 iss; the HTTP host must give it a distinct callback. /v1/users/me is the bot and is not used.
   * No retained API access is installed. Credentials are captured when the host builds its Layer;
   * supply HttpClient and crypto in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Notion authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Notion authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/notion/provider.ts"

export {
  /**
   * Schema for the person fields returned by Notion user lookup.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  NotionPerson,
  /**
   * Authorizing Notion user from the token response owner.user object. /v1/users/me is the bot, not
   * this person.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  NotionUserProfile
} from "./internal/oauth/providers/notion/profile.ts"
