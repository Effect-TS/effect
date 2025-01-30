/**
 * @since 1.0.0
 */
import type * as Chunk from "effect/Chunk"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { EmbeddingVector } from "./EmbeddingInput.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol("@effect/ai/EmbeddingResponse")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export class EmbeddingResponse extends Schema.Class<EmbeddingResponse>("@effect/ai/EmbeddingResponse")({
  index: Schema.Int,
  embedding: EmbeddingVector
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is EmbeddingResponse {
    return Predicate.hasProperty(u, TypeId)
  }
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const EmbeddingsResponseTypeId: unique symbol = Symbol("@effect/ai/EmbeddingsResponse")

/**
 * @since 1.0.0
 * @category type ids
 */
export type EmbeddingsResponseTypeId = typeof EmbeddingsResponseTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type EmbeddingsResponse = Chunk.Chunk<EmbeddingResponse>

/**
 * @since 1.0.0
 * @category models
 */
export const isEmbeddingsResponse = (u: unknown): u is EmbeddingsResponse =>
  Predicate.hasProperty(u, EmbeddingsResponseTypeId)

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace EmbeddingsResponse {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Schema = Schema.Chunk<typeof EmbeddingResponse>
}

/**
 * @since 1.0.0
 * @category models
 */
export const EmbeddingsResponse = Schema.Chunk(EmbeddingResponse)
