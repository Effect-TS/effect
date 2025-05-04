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
    tokenize(input) {
      return Effect.try({
        try: () =>
          GptTokenizer.encodeChat(
            Arr.flatMap(input.messages, (message) =>
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
                    {
                      role: message._tag === "UserMessage" ? "user" : "assistant",
                      name: message._tag === "UserMessage" && Predicate.isNotUndefined(message.userName)
                        ? message.userName
                        : undefined,
                      content: part._tag === "TextPart"
                        ? part.text
                        : JSON.stringify(part._tag === "ToolCallPart" ? part.params : part.result)
                    } as const
                  )
                }
              )),
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
