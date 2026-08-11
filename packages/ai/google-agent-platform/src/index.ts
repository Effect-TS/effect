/**
 * @since 4.0.0
 */

/**
 * Low-level client for the Gemini Enterprise Agent Platform APIs.
 *
 * Provides a type-safe, Effect-based client for the Gemini `generateContent`,
 * `streamGenerateContent`, and `predict` (embeddings) endpoints, including
 * authentication via `google-auth-library` (OAuth) or an API key (express
 * mode).
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformClient from "./GoogleAgentPlatformClient.ts"

/**
 * The `GoogleAgentPlatformConfig` module provides contextual configuration for the
 * Gemini Enterprise Agent Platform provider integration. It is used to customize the underlying
 * Google Agent Platform HTTP client without changing individual request code.
 *
 * **Common tasks**
 *
 * - Provide a shared `HttpClient` transformation for Google Agent Platform requests
 * - Add provider-specific concerns such as request instrumentation, proxying,
 *   retries, or header manipulation
 * - Scope a client transformation to a single effect with {@link withClientTransform}
 *
 * **Gotchas**
 *
 * - Configuration is read from the Effect context, so overrides only apply to
 *   effects run inside the configured scope
 * - `withClientTransform` replaces the current `transformClient` value while
 *   preserving any other Google Agent Platform configuration fields
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformConfig from "./GoogleAgentPlatformConfig.ts"

/**
 * Gemini Enterprise Agent Platform embedding model implementation.
 *
 * Provides an `EmbeddingModel` implementation for text embedding models via
 * `predict` and for `gemini-embedding-2` via `embedContent`.
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformEmbeddingModel from "./GoogleAgentPlatformEmbeddingModel.ts"

/**
 * Google Agent Platform error metadata augmentation.
 *
 * Provides Google Agent Platform-specific metadata fields for AI error types through
 * module augmentation, enabling typed access to Google Agent Platform error details.
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformError from "./GoogleAgentPlatformError.ts"

/**
 * The `GoogleAgentPlatformLanguageModel` module provides the Google Agent Platform (Gemini)
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
export * as GoogleAgentPlatformLanguageModel from "./GoogleAgentPlatformLanguageModel.ts"

/**
 * Google Agent Platform telemetry attributes for OpenTelemetry integration.
 *
 * Provides Google Agent Platform-specific GenAI telemetry attributes following
 * OpenTelemetry semantic conventions, extending the base GenAI attributes with
 * Google Agent Platform-specific request and response metadata.
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformTelemetry from "./GoogleAgentPlatformTelemetry.ts"

/**
 * Google Agent Platform provider-defined tools for use with the LanguageModel.
 *
 * Provides grounding and execution tools that are natively supported by the
 * Gemini API, including Google Search grounding, URL context, and code
 * execution.
 *
 * @since 4.0.0
 */
export * as GoogleAgentPlatformTool from "./GoogleAgentPlatformTool.ts"
