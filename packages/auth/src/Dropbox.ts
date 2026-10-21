/**
 * OAuth provider configuration and identity schemas for Dropbox.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Decodes dropbox IDentity from the provider response.
   *
   * @stability unstable
   * @category decoding
   * @since 4.1.0
   */
  decodeDropboxIdentity,
  /**
   * Dropbox provider key.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  dropboxProviderKey,
  /**
   * Creates a Dropbox authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Dropbox through shared plain OAuth. Identity is POST /2/users/get_current_account
   * with an empty body. PKCE S256 is sent even though Dropbox does not advertise it. Dropbox does not
   * advertise RFC 9207 iss; the HTTP host must give it a distinct callback. No retained API access is
   * installed. Credentials are captured when the host builds its Layer; supply HttpClient and crypto
   * in that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Dropbox authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Dropbox authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/dropbox/provider.ts"

export {
  /**
   * Schema for the name fields returned by Dropbox account lookup.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  DropboxName,
  /**
   * Dropbox /2/users/get_current_account fields used for sign-in. account_id is the durable subject.
   * email_verified is a provider claim, not an account-link authority.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  DropboxUserProfile
} from "./internal/oauth/providers/dropbox/profile.ts"
