/**
 * OAuth provider configuration and identity schemas for Hugging Face.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a HuggingFace authentication provider definition.
   *
   * **Details**
   *
   * Hugging Face OpenID Connect with standard claims. Give this issuer a distinct callback because it
   * does not advertise response iss.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Hugging Face authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Hugging Face authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/huggingface/provider.ts"

export {
  /**
   * Schema for the OpenID Connect claims accepted from Hugging Face.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  HuggingFaceUserProfile
} from "./internal/oauth/providers/huggingface/profile.ts"
