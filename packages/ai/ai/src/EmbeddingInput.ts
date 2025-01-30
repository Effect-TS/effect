/**
 * @since 1.0.0
 */
import * as Predicate from "effect/Predicate"
import * as Schema_ from "effect/Schema"

/**
 * @since 1.0.0
 * @category vectors
 */
export const EmbeddingVectorTypeId: unique symbol = Symbol("@effect/ai/EmbeddingVector")

/**
 * @since 1.0.0
 * @category vectors
 */
export type EmbeddingVectorTypeId = typeof EmbeddingVectorTypeId

/**
 * @since 1.0.0
 * @category vectors
 */
export type EmbeddingVector = ReadonlyArray<number>

/**
 * @since 1.0.0
 * @category vectors
 */
export const isEmbeddingVector = (u: unknown): u is EmbeddingVector => Predicate.hasProperty(u, EmbeddingVectorTypeId)

/**
 * @since 1.0.0
 * @category vectors
 */
export declare namespace EmbeddingVector {
  /**
   * @since 1.0.0
   * @category vectors
   */
  export type Schema = Schema_.Array$<typeof Schema_.Number>
}

/**
 * @since 1.0.0
 * @category vectors
 */
export const EmbeddingVector: EmbeddingVector.Schema = Schema_.Array(Schema_.Number)

/**
 * @since 1.0.0
 * @category models
 */
export type EmbeddingInput =
  | string
  | Iterable<string>
  | EmbeddingVector
  | Iterable<EmbeddingVector>
