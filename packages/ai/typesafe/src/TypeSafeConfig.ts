/**
 * The `TypeSafeConfig` module lets a workflow temporarily customize the HTTP
 * client used by `@effect/ai-typesafe` request helpers. The TypeSafe client reads
 * this scoped transform when executing provider calls.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type { HttpClient } from "effect/unstable/http/HttpClient"

/**
 * Context service for scoped TypeSafe configuration used by provider operations.
 *
 * **When to use**
 *
 * Use to provide scoped TypeSafe client configuration, such as an HTTP client
 * transform, to TypeSafe provider operations without passing it through each call.
 *
 * @see {@link withClientTransform} for scoping an HTTP client transformation
 *
 * @category services
 * @since 4.0.0
 */
export class TypeSafeConfig extends Context.Service<
  TypeSafeConfig,
  TypeSafeConfig.Service
>()("@effect/ai-typesafe/TypeSafeConfig") {
  /**
   * Gets the configured TypeSafe service from the current context when present.
   *
   * @since 4.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof TypeSafeConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    Context.getOrUndefined(TypeSafeConfig)
  )
}

/**
 * Types used by the `TypeSafeConfig` context service.
 *
 * @since 4.0.0
 */
export declare namespace TypeSafeConfig {
  /**
   * Configuration values read by TypeSafe provider operations when executing
   * requests.
   *
   * @category services
   * @since 4.0.0
   */
  export interface Service {
    readonly transformClient?: ((client: HttpClient) => HttpClient) | undefined
  }
}

/**
 * Provides a scoped transform for the TypeSafe HTTP client used by provider
 * operations.
 *
 * **When to use**
 *
 * Use when you need temporary TypeSafe HTTP client customization for a single
 * effect or workflow without rebuilding the client layer.
 *
 * **Details**
 *
 * Supports both data-first and data-last forms. The transform is stored in the
 * scoped `TypeSafeConfig` service and read by TypeSafe provider operations while
 * running the supplied effect.
 *
 * **Gotchas**
 *
 * If a transform is already present in the scoped config, this helper replaces
 * it. Compose transforms manually when both should apply.
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
    TypeSafeConfig.getOrUndefined,
    (config) => Effect.provideService(self, TypeSafeConfig, { ...config, transformClient })
  ))
