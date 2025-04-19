/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as GptTokenizer from "gpt-tokenizer"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: { readonly model: string }) =>
  Tokenizer.make({
    tokenize(content) {
      return Effect.try({
        try: () =>
          GptTokenizer.encodeChat(
            Arr.flatMap(content, (message) =>
              Arr.filterMap(message.parts as Array<AiInput.Part>, (part) => {
                if (
                  part._tag === "File" ||
                  part._tag === "Image" ||
                  part._tag === "Reasoning" ||
                  part._tag === "RedactedReasoning"
                ) return Option.none()
                return Option.some(
                  {
                    role: message.role === "user" ? "user" : "assistant",
                    name: message.role === "user" && Predicate.isNotUndefined(message.userName)
                      ? message.userName
                      : undefined,
                    content: part._tag === "Text"
                      ? part.content
                      : JSON.stringify(part._tag === "ToolCall" ? part.params : part.result)
                  } as const
                )
              })),
            options.model as any
          ),
        catch: (cause) =>
          new AiError({
            module: "OpenAiTokenizer",
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
export const layer = (options: { readonly model: string }): Layer.Layer<Tokenizer.Tokenizer> =>
  Layer.succeed(Tokenizer.Tokenizer, make(options))
