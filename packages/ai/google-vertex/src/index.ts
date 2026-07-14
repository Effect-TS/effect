/**
 * @since 4.0.0
 */

/**
 * Google Vertex Client module for interacting with the Vertex AI Gemini API.
 *
 * Provides a type-safe, Effect-based client for the Gemini `generateContent`,
 * `streamGenerateContent`, and `predict` (embeddings) endpoints, including
 * authentication via `google-auth-library` (OAuth) or an API key (express
 * mode).
 *
 * @since 4.0.0
 */
export * as GoogleVertexClient from "./GoogleVertexClient.ts"

/**
 * The `GoogleVertexConfig` module provides contextual configuration for the
 * Google Vertex AI provider integration. It is used to customize the underlying
 * Google Vertex HTTP client without changing individual request code.
 *
 * **Common tasks**
 *
 * - Provide a shared `HttpClient` transformation for Google Vertex requests
 * - Add provider-specific concerns such as request instrumentation, proxying,
 *   retries, or header manipulation
 * - Scope a client transformation to a single effect with {@link withClientTransform}
 *
 * **Gotchas**
 *
 * - Configuration is read from the Effect context, so overrides only apply to
 *   effects run inside the configured scope
 * - `withClientTransform` replaces the current `transformClient` value while
 *   preserving any other Google Vertex configuration fields
 *
 * @since 4.0.0
 */
export * as GoogleVertexConfig from "./GoogleVertexConfig.ts"

/**
 * Google Vertex Embedding Model implementation.
 *
 * Provides an `EmbeddingModel` implementation for the Vertex AI text embedding
 * models via the `predict` endpoint.
 *
 * @since 4.0.0
 */
export * as GoogleVertexEmbeddingModel from "./GoogleVertexEmbeddingModel.ts"

/**
 * Google Vertex error metadata augmentation.
 *
 * Provides Google Vertex-specific metadata fields for AI error types through
 * module augmentation, enabling typed access to Google Vertex error details.
 *
 * @since 4.0.0
 */
export * as GoogleVertexError from "./GoogleVertexError.ts"

/**
 * The `GoogleVertexLanguageModel` module provides the Google Vertex (Gemini)
 * implementation of Effect AI's `LanguageModel` service. It converts Effect AI
 * prompts, tools, and provider options into Gemini `generateContent` requests,
 * and converts Gemini responses and streams back into Effect AI response parts.
 *
 * **When to use**
 *
 * - Create a Gemini-backed model with {@link model}
 * - Build or provide a `LanguageModel.LanguageModel` layer with {@link layer}
 *   or {@link make}
 * - Supply default request options through {@link Config}
 * - Override configuration for a scoped operation with {@link withConfigOverride}
 *
 * @since 4.0.0
 */
export * as GoogleVertexLanguageModel from "./GoogleVertexLanguageModel.ts"

/**
 * Google Vertex telemetry attributes for OpenTelemetry integration.
 *
 * Provides Google Vertex-specific GenAI telemetry attributes following
 * OpenTelemetry semantic conventions, extending the base GenAI attributes with
 * Google Vertex-specific request and response metadata.
 *
 * @since 4.0.0
 */
export * as GoogleVertexTelemetry from "./GoogleVertexTelemetry.ts"

/**
 * Google Vertex provider-defined tools for use with the LanguageModel.
 *
 * Provides grounding and execution tools that are natively supported by the
 * Gemini API, including Google Search grounding, URL context, and code
 * execution.
 *
 * @since 4.0.0
 */
export * as GoogleVertexTool from "./GoogleVertexTool.ts"
