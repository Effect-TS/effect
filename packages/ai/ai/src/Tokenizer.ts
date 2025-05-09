/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type { AiError } from "./AiError.js"
import * as AiInput from "./AiInput.js"

/**
 * @since 1.0.0
 * @category Tags
 */
export class Tokenizer extends Context.Tag("@effect/ai/Tokenizer")<
  Tokenizer,
  Tokenizer.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace Tokenizer {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    readonly tokenize: (input: AiInput.Raw) => Effect.Effect<Array<number>, AiError>
    readonly truncate: (input: AiInput.Raw, tokens: number) => Effect.Effect<AiInput.AiInput, AiError>
  }
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly tokenize: (content: AiInput.AiInput) => Effect.Effect<Array<number>, AiError>
}): Tokenizer.Service =>
  Tokenizer.of({
    tokenize(input) {
      return options.tokenize(AiInput.make(input))
    },
    truncate(input, tokens) {
      return truncate(AiInput.make(input), options.tokenize, tokens)
    }
  })

const truncate = (
  self: AiInput.AiInput,
  tokenize: (input: AiInput.AiInput) => Effect.Effect<Array<number>, AiError>,
  maxTokens: number
): Effect.Effect<AiInput.AiInput, AiError> =>
  Effect.suspend(() => {
    let count = 0
    let inputMessages = self.messages
    let outputMessages: Array<AiInput.Message> = []
    const loop: Effect.Effect<AiInput.AiInput, AiError> = Effect.suspend(() => {
      const message = inputMessages[inputMessages.length - 1]
      if (Predicate.isUndefined(message)) {
        return Effect.succeed(AiInput.make(outputMessages))
      }
      inputMessages = inputMessages.slice(0, inputMessages.length - 1)
      return Effect.flatMap(tokenize(AiInput.make(message)), (tokens) => {
        count += tokens.length
        if (count > maxTokens) {
          return Effect.succeed(AiInput.make(outputMessages))
        }
        outputMessages = [message, ...outputMessages]
        return loop
      })
    })
    return loop
  })
