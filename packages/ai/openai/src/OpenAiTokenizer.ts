/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import type * as Prompt from "@effect/ai/Prompt"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as GptTokenizer from "gpt-tokenizer"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: { readonly model: string }) =>
  Tokenizer.make({
    tokenize(prompt) {
      return Effect.try({
        try: () => {
          const content: Array<{
            readonly role: "assistant" | "system" | "user"
            readonly content: string
          }> = []

          for (const message of prompt.content) {
            if (message.role === "system") {
              content.push({ role: getRole(message), content: message.content })
              continue
            }

            for (const part of message.content) {
              switch (part.type) {
                case "reasoning":
                case "text": {
                  content.push({ role: getRole(message), content: part.text })
                  break
                }
                case "tool-call": {
                  content.push({ role: getRole(message), content: JSON.stringify(part.params) })
                  break
                }
                case "tool-result": {
                  content.push({ role: getRole(message), content: JSON.stringify(part.result) })
                  break
                }
              }
            }
          }
          return GptTokenizer.encodeChat(content, options.model as any)
        },
        catch: (cause) =>
          new AiError.UnknownError({
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

const getRole = (message: Prompt.Message): "assistant" | "system" | "user" =>
  message.role === "tool" ? "assistant" : message.role
