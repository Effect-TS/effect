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
    readonly tokenize: (content: AiInput.Raw) => Effect.Effect<Array<number>, AiError>
    readonly truncate: (content: AiInput.Raw, tokens: number) => Effect.Effect<AiInput.Raw, AiError>
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
    truncate(content, tokens) {
      return truncate(AiInput.make(content), options.tokenize, tokens)
    }
  })

const truncate = (
  self: AiInput.AiInput,
  tokenize: (content: AiInput.AiInput) => Effect.Effect<Array<number>, AiError>,
  maxTokens: number
): Effect.Effect<AiInput.AiInput, AiError> =>
  Effect.suspend(() => {
    let count = 0
    let inParts = self
    let outParts: Array<AiInput.Message> = []
    const loop: Effect.Effect<AiInput.AiInput, AiError> = Effect.suspend(() => {
      const part = inParts[inParts.length - 1]
      if (Predicate.isUndefined(part)) {
        return Effect.succeed(AiInput.make(outParts))
      }
      inParts = inParts.slice(0, inParts.length - 1)
      return Effect.flatMap(tokenize([part]), (tokens) => {
        count += tokens.length
        if (count > maxTokens) {
          return Effect.succeed(AiInput.make(outParts))
        }
        outParts = [part, ...outParts]
        return loop
      })
    })
    return loop
  })
