/**
 * @since 1.0.0
 */
import { getTokenizer } from "@anthropic-ai/tokenizer"
import * as AiError from "@effect/ai/AiError"
import type * as Prompt from "@effect/ai/Prompt"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Tokenizer.make({
  tokenize(prompt) {
    return Effect.try({
      try: () => {
        const tokenizer = getTokenizer()
        const text = Arr.flatMap(prompt.content, (message) =>
          Arr.filterMap(
            message.content as Array<
              | Prompt.AssistantMessagePart
              | Prompt.ToolMessagePart
              | Prompt.UserMessagePart
            >,
            (part) => {
              if (part.type === "file" || part.type === "reasoning") {
                return Option.none()
              }
              return Option.some(
                part.type === "text"
                  ? part.text
                  : JSON.stringify(part.type === "tool-call" ? part.params : part.result)
              )
            }
          )).join("")
        const encoded = tokenizer.encode(text.normalize("NFKC"), "all")
        tokenizer.free()
        return Array.from(encoded)
      },
      catch: (cause) =>
        new AiError.UnknownError({
          module: "AnthropicTokenizer",
          method: "tokenize",
          description: "Could not tokenize",
          cause
        })
    })
  }
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<Tokenizer.Tokenizer> = Layer.succeed(Tokenizer.Tokenizer, make)
