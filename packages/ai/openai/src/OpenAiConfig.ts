/**
 * @since 1.0.0
 */
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
  Simplify<
    Partial<
      Omit<
        typeof Generated.CreateChatCompletionRequest.Encoded,
        "messages" | "tools" | "tool_choice" | "stream" | "stream_options" | "functions"
      >
    >
  >
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof OpenAiConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(OpenAiConfig.key)
  )
}
