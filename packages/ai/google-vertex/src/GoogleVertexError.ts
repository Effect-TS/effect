/**
 * Google Vertex error metadata augmentation.
 *
 * Provides Google Vertex-specific metadata fields for AI error types through
 * module augmentation, enabling typed access to Google Vertex error details.
 *
 * @since 4.0.0
 */

/**
 * Google Vertex-specific error metadata fields.
 *
 * @category models
 * @since 4.0.0
 */
export type GoogleVertexErrorMetadata = {
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
   * Google Vertex metadata attached to `RateLimitError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface RateLimitErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }

  /**
   * Google Vertex metadata attached to `AuthenticationError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface AuthenticationErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }

  /**
   * Google Vertex metadata attached to `InvalidRequestError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InvalidRequestErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }

  /**
   * Google Vertex metadata attached to `InternalProviderError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InternalProviderErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }

  /**
   * Google Vertex metadata attached to `InvalidOutputError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface InvalidOutputErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }

  /**
   * Google Vertex metadata attached to `UnknownError` values.
   *
   * @category configuration
   * @since 4.0.0
   */
  export interface UnknownErrorMetadata {
    readonly googleVertex?: GoogleVertexErrorMetadata | null
  }
}
