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
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type { HttpClient } from "effect/unstable/http/HttpClient"

/**
 * Service tag for Google Vertex client configuration overrides, such as
 * transformations applied to the underlying HTTP client.
 *
 * @category services
 * @since 4.0.0
 */
export class GoogleVertexConfig extends Context.Service<
  GoogleVertexConfig,
  GoogleVertexConfig.Service
>()("@effect/ai-google-vertex/GoogleVertexConfig") {
  /**
   * Gets the configured Google Vertex service from the current context when
   * present.
   *
   * @since 4.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof GoogleVertexConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (services) => services.mapUnsafe.get(GoogleVertexConfig.key)
  )
}

/**
 * Namespace containing types associated with the `GoogleVertexConfig` service.
 *
 * @since 4.0.0
 */
export declare namespace GoogleVertexConfig {
  /**
   * Configuration provided through `GoogleVertexConfig`.
   *
   * **Details**
   *
   * Use `transformClient` to wrap or replace the `HttpClient` used by Google
   * Vertex API requests.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Service {
    readonly transformClient?: ((client: HttpClient) => HttpClient) | undefined
  }
}

/**
 * Runs an effect with a `GoogleVertexConfig` override that transforms the
 * underlying `HttpClient` used by Google Vertex requests.
 *
 * @category configuration
 * @since 4.0.0
 */
export const withClientTransform: {
  (transform: (client: HttpClient) => HttpClient): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, transform: (client: HttpClient) => HttpClient): Effect.Effect<A, E, R>
} = dual(2, <A, E, R>(
  self: Effect.Effect<A, E, R>,
  transformClient: (client: HttpClient) => HttpClient
) =>
  Effect.flatMap(
    GoogleVertexConfig.getOrUndefined,
    (config) => Effect.provideService(self, GoogleVertexConfig, { ...config, transformClient })
  ))
