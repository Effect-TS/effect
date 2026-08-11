/**
 * Google Agent Platform error metadata augmentation.
 *
 * Provides Google Agent Platform-specific metadata fields for AI error types through
 * module augmentation, enabling typed access to Google Agent Platform error details.
 *
 * @since 4.0.0
 */

/**
 * Google Agent Platform-specific error metadata fields.
 *
 * @category models
 * @since 4.0.0
 */
export type GoogleAgentPlatformErrorMetadata = {
  /**
   * The Google API status string (e.g. `INVALID_ARGUMENT`, `NOT_FOUND`).
   */
  readonly status?: string | null
  /**
   * A human-readable message describing the failure, when available.
   */
  readonly message?: string | null
}

declare module "effect/unstable/ai/AiError" {
  /**
   * Google Agent Platform metadata attached to `RateLimitError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface RateLimitErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }

  /**
   * Google Agent Platform metadata attached to `AuthenticationError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface AuthenticationErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }

  /**
   * Google Agent Platform metadata attached to `InvalidRequestError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InvalidRequestErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }

  /**
   * Google Agent Platform metadata attached to `InternalProviderError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InternalProviderErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }

  /**
   * Google Agent Platform metadata attached to `InvalidOutputError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InvalidOutputErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }

  /**
   * Google Agent Platform metadata attached to `UnknownError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface UnknownErrorMetadata {
    readonly googleAgentPlatform?: GoogleAgentPlatformErrorMetadata | null
  }
}
