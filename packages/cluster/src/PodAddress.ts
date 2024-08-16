/**
 * @since 1.0.0
 */
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"

const SymbolKey = "@effect/cluster/PodAddress"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(SymbolKey)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export class PodAddress extends Schema.Class<PodAddress>(SymbolKey)({
  host: Schema.NonEmptyString,
  port: Schema.Int
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;

  /**
   * @since 1.0.0
   */
  [Hash.symbol]() {
    return Hash.cached(this)(Hash.string(this.toString()))
  }

  toString(): string {
    return `${this.host}:${this.port}`
  }
}
