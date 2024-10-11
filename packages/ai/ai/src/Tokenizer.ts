/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { AiError } from "./AiError.js"
import type { Message } from "./AiInput.js"
import * as AiInput from "./AiInput.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Tokenizer extends Context.Tag("@effect/ai/Tokenizer")<
  Tokenizer,
  Tokenizer.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Tokenizer {
  /**
   * @since 1.0.0
   * @models
   */
  export interface Service {
    readonly tokenize: (content: AiInput.Input) => Effect.Effect<Array<number>, AiError>
    readonly truncate: (content: AiInput.Input, tokens: number) => Effect.Effect<AiInput.Input, AiError>
  }
}

/**
 * @since 1.0.0
 * @category constructors
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
    let outParts: Chunk.Chunk<Message> = Chunk.empty()
    const loop: Effect.Effect<AiInput.AiInput, AiError> = Effect.suspend(() => {
      const o = Chunk.last(inParts)
      if (Option.isNone(o)) {
        return Effect.succeed(AiInput.make(outParts))
      }
      const part = o.value
      inParts = Chunk.dropRight(inParts, 1)
      return Effect.flatMap(tokenize(Chunk.of(part)), (tokens) => {
        count += tokens.length
        if (count > maxTokens) {
          return Effect.succeed(AiInput.make(outParts))
        }
        outParts = Chunk.prepend(outParts, part)
        return loop
      })
    })
    return loop
  })
