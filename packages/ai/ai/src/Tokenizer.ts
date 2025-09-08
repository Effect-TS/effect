/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type { AiError } from "./AiError.js"
import * as Prompt from "./Prompt.js"

/**
 * @since 1.0.0
 * @category Tags
 */
export class Tokenizer extends Context.Tag("@effect/ai/Tokenizer")<
  Tokenizer,
  Service
>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly tokenize: (input: Prompt.RawInput) => Effect.Effect<Array<number>, AiError>
  readonly truncate: (input: Prompt.RawInput, tokens: number) => Effect.Effect<Prompt.Prompt, AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly tokenize: (content: Prompt.Prompt) => Effect.Effect<Array<number>, AiError>
}): Service =>
  Tokenizer.of({
    tokenize(input) {
      return options.tokenize(Prompt.make(input))
    },
    truncate(input, tokens) {
      return truncate(Prompt.make(input), options.tokenize, tokens)
    }
  })

const truncate = (
  self: Prompt.Prompt,
  tokenize: (input: Prompt.Prompt) => Effect.Effect<Array<number>, AiError>,
  maxTokens: number
): Effect.Effect<Prompt.Prompt, AiError> =>
  Effect.suspend(() => {
    let count = 0
    let inputMessages = self.content
    let outputMessages: Array<Prompt.Message> = []
    const loop: Effect.Effect<Prompt.Prompt, AiError> = Effect.suspend(() => {
      const message = inputMessages[inputMessages.length - 1]
      if (Predicate.isUndefined(message)) {
        return Effect.succeed(Prompt.fromMessages(outputMessages))
      }
      inputMessages = inputMessages.slice(0, inputMessages.length - 1)
      return Effect.flatMap(tokenize(Prompt.fromMessages([message])), (tokens) => {
        count += tokens.length
        if (count > maxTokens) {
          return Effect.succeed(Prompt.fromMessages(outputMessages))
        }
        outputMessages = [message, ...outputMessages]
        return loop
      })
    })
    return loop
  })
