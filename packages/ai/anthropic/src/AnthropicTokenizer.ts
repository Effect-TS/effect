/**
 * @since 1.0.0
 */
import { getTokenizer } from "@anthropic-ai/tokenizer"
import { AiError } from "@effect/ai/AiError"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

const make = Tokenizer.make({
  tokenize(content) {
    return Effect.try({
      try: () => {
        const tokenizer = getTokenizer()
        const text = Arr.flatMap(Chunk.toReadonlyArray(content), (message) =>
          Arr.filterMap(message.parts, (part) => {
            if (part._tag === "Image" || part._tag === "ImageUrl") {
              return Option.none()
            }
            return Option.some(
              part._tag === "Text"
                ? part.content
                : JSON.stringify(
                  part._tag === "ToolCall"
                    ? part.params :
                    part.value
                )
            )
          })).join("")
        const encoded = tokenizer.encode(text.normalize("NFKC"), "all")
        tokenizer.free()
        return Array.from(encoded)
      },
      catch: (cause) =>
        new AiError({
          module: "OpenAiCompletions",
          method: "tokenize",
          description: "Could not tokenize",
          cause
        })
    })
  }
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Tokenizer.Tokenizer> = Layer.succeed(Tokenizer.Tokenizer, make)
