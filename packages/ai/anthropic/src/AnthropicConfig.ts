/**
 * @since 1.0.0
 */
import type { HttpClient } from "@effect/platform/HttpClient"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class AnthropicConfig extends Context.Tag("@effect/ai-openai/AnthropicConfig")<
  AnthropicConfig,
  AnthropicConfig.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof AnthropicConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(AnthropicConfig.key)
  )
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace AnthropicConfig {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateMessageParams.Encoded,
          "messages" | "tools" | "tool_choice" | "stream"
        >
      >
    >
  {
    readonly transformClient?: (client: HttpClient) => HttpClient
  }
}

/**
 * @since 1.0.0
 * @category configuration
 */
export const withClientTransform: {
  (transform: (client: HttpClient) => HttpClient): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, transform: (client: HttpClient) => HttpClient): Effect.Effect<A, E, R>
} = dual<
  (transform: (client: HttpClient) => HttpClient) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, transform: (client: HttpClient) => HttpClient) => Effect.Effect<A, E, R>
>(
  2,
  (self, transformClient) =>
    Effect.flatMap(
      AnthropicConfig.getOrUndefined,
      (config) => Effect.provideService(self, AnthropicConfig, { ...config, transformClient })
    )
)
