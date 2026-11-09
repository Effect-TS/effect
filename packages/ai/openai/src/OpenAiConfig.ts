/**
 * The `OpenAiConfig` module lets a workflow temporarily customize the HTTP
 * client used by `@effect/ai-openai` request helpers. OpenAI client, language
 * model, and embedding code read this scoped transform when they execute
 * provider calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as HttpClient from "effect/http/HttpClient"

/**
 * Context service for scoped OpenAI configuration used by provider operations.
 *
 * **When to use**
 *
 * Use to provide scoped OpenAI client configuration, such as an HTTP client
 * transform, to OpenAI provider operations without passing it through each call.
 *
 * @see {@link withClientTransform} for scoping an HTTP client transformation
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class OpenAiConfig extends Context.Service<
  OpenAiConfig,
  OpenAiConfig.Service
>()("@effect/ai-openai/OpenAiConfig") {
  /**
   * Gets the configured OpenAI service from the current context when present.
   *
   * @since 4.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof OpenAiConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    Context.getOrUndefined(OpenAiConfig)
  )
}

/**
 * Types used by the `OpenAiConfig` context service.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace OpenAiConfig {
  /**
   * Configuration values read by OpenAI provider operations when executing
   * requests.
   *
   * **Details**
   *
   * `transformClient` receives the client after credentials are applied, whose
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
 * Provides a scoped transform for the OpenAI HTTP client used by provider
 * operations.
 *
 * **When to use**
 *
 * Use when you need temporary OpenAI HTTP client customization for a single
 * effect or workflow without rebuilding the client layer.
 *
 * **Details**
 *
 * Supports both data-first and data-last forms. The transform is stored in the
 * scoped `OpenAiConfig` service and read by OpenAI provider operations while
 * running the supplied effect.
 *
 * **Gotchas**
 *
 * If a transform is already present in the scoped config, this helper replaces
 * it. Compose transforms manually when both should apply.
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
    OpenAiConfig.getOrUndefined,
    (config) => Effect.provideService(self, OpenAiConfig, { ...config, transformClient })
  ))
