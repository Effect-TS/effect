/**
 * OAuth provider configuration and identity schemas for Line.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Line authentication provider definition.
   *
   * **Details**
   *
   * LINE Login through the shared OIDC implementation. Web authorization-code tokens use HS256 and the
   * channel secret; discovery advertises only ES256, so the preset supplies the documented web
   * algorithm. LINE does not advertise response iss, so the host must give it a distinct callback.
   * `sub` is the user ID for that LINE provider and is shared across its channels.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Line authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Line authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/line/provider.ts"

export {
  /**
   * Standard profile plus LINE authentication-method references from verified ID tokens. LINE `sub` is
   * the user ID for that provider, shared across its channels.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LineUserProfile
} from "./internal/oauth/providers/line/profile.ts"
