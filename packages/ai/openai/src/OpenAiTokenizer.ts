/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as GptTokenizer from "gpt-tokenizer"
import { OpenAiConfig } from "./OpenAiConfig.js"

const make = (options: { readonly model: string }) =>
  Tokenizer.make({
    tokenize(content) {
      return Effect.tryMap(OpenAiConfig.getOrUndefined, {
        try: (localConfig) =>
          GptTokenizer.encodeChat(
            content.pipe(
              Chunk.toReadonlyArray,
              Arr.flatMap((message) =>
                message.parts.pipe(
                  Arr.filterMap((part) => {
                    if (part._tag === "Image" || part._tag === "ImageUrl") {
                      return Option.none()
                    }
                    return Option.some(
                      {
                        role: message.role.kind === "user" ? "user" : "assistant",
                        name: message.role._tag === "UserWithName" ? message.role.name : undefined,
                        content: part._tag === "Text"
                          ? part.content
                          : JSON.stringify(part._tag === "ToolCall" ? part.params : part.value)
                      } as const
                    )
                  })
                )
              )
            ),
            localConfig?.model ?? options.model as any
          ),
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
export const layer = (options: { readonly model: string }): Layer.Layer<Tokenizer.Tokenizer> =>
  Layer.succeed(Tokenizer.Tokenizer, make(options))
