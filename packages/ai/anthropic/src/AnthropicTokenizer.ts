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
  tokenize(input) {
    return Effect.try({
      try: () => {
        const tokenizer = getTokenizer()
        const text = Arr.flatMap(input.messages, (message) =>
          Arr.filterMap(
            message.parts as Array<
              | AiInput.AssistantMessagePart
              | AiInput.ToolMessagePart
              | AiInput.UserMessagePart
            >,
            (part) => {
              if (
                part._tag === "FilePart" ||
                part._tag === "FileUrlPart" ||
                part._tag === "ImagePart" ||
                part._tag === "ImageUrlPart" ||
                part._tag === "ReasoningPart" ||
                part._tag === "RedactedReasoningPart"
              ) return Option.none()
              return Option.some(
                part._tag === "TextPart"
                  ? part.text
                  : JSON.stringify(
                    part._tag === "ToolCallPart"
                      ? part.params :
                      part.result
                  )
              )
            }
          )).join("")
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
