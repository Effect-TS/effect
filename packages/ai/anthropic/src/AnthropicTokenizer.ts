/**
 * @since 1.0.0
 */
import { getTokenizer } from "@anthropic-ai/tokenizer"
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
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
  tokenize(content) {
    return Effect.try({
      try: () => {
        const tokenizer = getTokenizer()
        const text = Arr.flatMap(content, (message) =>
          Arr.filterMap(message.parts as Array<AiInput.Part>, (part) => {
            if (
              part._tag === "File" ||
              part._tag === "Image" ||
              part._tag === "Reasoning" ||
              part._tag === "RedactedReasoning"
            ) return Option.none()
            return Option.some(
              part._tag === "Text"
                ? part.content
                : JSON.stringify(
                  part._tag === "ToolCall"
                    ? part.params :
                    part.result
                )
            )
          })).join("")
        const encoded = tokenizer.encode(text.normalize("NFKC"), "all")
        tokenizer.free()
        return Array.from(encoded)
      },
      catch: (cause) =>
        new AiError({
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
