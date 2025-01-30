/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { AiError } from "./AiError.js"
import type { EmbeddingInput } from "./EmbeddingInput.js"
import type { EmbeddingsResponse } from "./EmbeddingResponse.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Embeddings extends Context.Tag("@effect/ai/Embeddings")<
  Embeddings,
  Embeddings.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Embeddings {
  /**
   * @since 1.0.0
   * @models
   */
  export interface Service {
    readonly create: (input: EmbeddingInput) => Effect.Effect<EmbeddingsResponse, AiError>
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EmbeddingOptions {
  readonly input: EmbeddingInput
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: {
  readonly create: (options: {
    readonly input: EmbeddingInput
  }) => Effect.Effect<EmbeddingsResponse, AiError>
}): Embeddings.Service => {
  return Embeddings.of({
    create(input) {
      return options.create({ input }).pipe(
        Effect.withSpan("Embeddings.create", { captureStackTrace: false })
      )
    }
  })
}
