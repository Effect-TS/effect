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
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type { HttpClient } from "effect/unstable/http/HttpClient"

/**
 * Service tag for Google Agent Platform client configuration overrides, such as
 * transformations applied to the underlying HTTP client.
 *
 * @category services
 * @since 4.0.0
 */
export class GoogleAgentPlatformConfig extends Context.Service<
  GoogleAgentPlatformConfig,
  GoogleAgentPlatformConfig.Service
>()("@effect/ai-google-agent-platform/GoogleAgentPlatformConfig") {
  /**
   * Gets the configured Google Agent Platform service from the current context when
   * present.
   *
   * @since 4.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof GoogleAgentPlatformConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (services) => services.mapUnsafe.get(GoogleAgentPlatformConfig.key)
  )
}

/**
 * Namespace containing types associated with the `GoogleAgentPlatformConfig` service.
 *
 * @since 4.0.0
 */
export declare namespace GoogleAgentPlatformConfig {
  /**
   * Configuration provided through `GoogleAgentPlatformConfig`.
   *
   * **Details**
   *
   * Use `transformClient` to wrap or replace the `HttpClient` used by Google
   * Agent Platform API requests.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Service {
    readonly transformClient?: ((client: HttpClient) => HttpClient) | undefined
  }
}

/**
 * Runs an effect with a `GoogleAgentPlatformConfig` override that transforms the
 * underlying `HttpClient` used by Google Agent Platform requests.
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
    GoogleAgentPlatformConfig.getOrUndefined,
    (config) => Effect.provideService(self, GoogleAgentPlatformConfig, { ...config, transformClient })
  ))
