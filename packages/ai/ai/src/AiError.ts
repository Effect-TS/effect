/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class AiError extends Schema.TaggedError<AiError>("@effect/ai/AiError")("AiError", {
  module: Schema.String,
  method: Schema.String,
  description: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
  /**
   * @since 1.0.0
   */
  get message(): string {
    return `${this.module}.${this.method}: ${this.description}`
  }
}
