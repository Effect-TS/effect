/**
 * @since 1.0.0
 */
import type { HttpClient } from "@effect/platform/HttpClient"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class OpenAiConfig extends Context.Tag("@effect/ai-openai/OpenAiConfig")<
  OpenAiConfig,
  OpenAiConfig.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof OpenAiConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(OpenAiConfig.key)
  )
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace OpenAiConfig {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateChatCompletionRequest.Encoded,
          "messages" | "tools" | "tool_choice" | "stream" | "stream_options" | "functions"
        >
      >
    >
  {
    readonly transformClient?: (client: HttpClient) => HttpClient
  }
}
