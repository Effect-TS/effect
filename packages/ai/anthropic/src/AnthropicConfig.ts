/**
 * The `AnthropicConfig` module lets a workflow temporarily customize the HTTP
 * client used by generated Anthropic requests. It is used by
 * `AnthropicClient` when request helpers run, so code can add middleware,
 * logging, or other client changes without rebuilding the client layer.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as HttpClient from "effect/http/HttpClient"

/**
 * Service tag for Anthropic client configuration overrides, such as transformations applied to the generated HTTP client.
 *
 * **When to use**
 *
 * Use when you need to provide or read Anthropic client configuration through
 * Effect's context from a layer or integration.
 *
 * @see {@link withClientTransform} for scoping an HTTP client transformation
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class AnthropicConfig extends Context.Service<
  AnthropicConfig,
  AnthropicConfig.Service
>()("@effect/ai-anthropic/AnthropicConfig") {
  /**
   * Gets the configured Anthropic service from the current context when present.
   *
   * @since 4.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof AnthropicConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    Context.getOrUndefined(AnthropicConfig)
  )
}

/**
 * Namespace containing types associated with the `AnthropicConfig` service.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace AnthropicConfig {
  /**
   * Configuration provided through `AnthropicConfig`.
   *
   * **Details**
   *
   * Use `transformClient` to wrap the `HttpClient` used by generated Anthropic
   * API requests. It receives the client after credentials are applied, whose
   * error type includes the credentials' `AiError`, so the transform must work
   * for any error and requirement types. Effect's `HttpClient` combinators,
   * such as `HttpClient.mapRequest`, already do.
   *
   * @category services
   * @since 4.0.0
   */
  export interface Service {
    readonly transformClient?:
      | (<E, R>(client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>)
      | undefined
  }
}

/**
 * Runs an effect with an `AnthropicConfig` override that transforms the underlying `HttpClient` used by generated Anthropic requests.
 *
 * **When to use**
 *
 * Use when you need to apply a temporary `HttpClient` transformation, such as adding middleware or logging, to a
 * specific scope of an effectful program.
 *
 * **Gotchas**
 *
 * The transform must be generic over the client's error and requirement types,
 * because the client it receives can fail with credential errors. Build it from
 * `HttpClient` combinators rather than a lambda typed `(client: HttpClient) =>`.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export const withClientTransform: {
  (
    transform: <E, R>(client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>
  ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    transform: <E2, R2>(client: HttpClient.HttpClient.With<E2, R2>) => HttpClient.HttpClient.With<E2, R2>
  ): Effect.Effect<A, E, R>
} = dual(2, <A, E, R>(
  self: Effect.Effect<A, E, R>,
  transformClient: <E2, R2>(client: HttpClient.HttpClient.With<E2, R2>) => HttpClient.HttpClient.With<E2, R2>
) =>
  Effect.flatMap(
    AnthropicConfig.getOrUndefined,
    (config) => Effect.provideService(self, AnthropicConfig, { ...config, transformClient })
  ))
