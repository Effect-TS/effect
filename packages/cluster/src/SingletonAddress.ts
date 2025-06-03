/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"
import { ShardId } from "./ShardId.js"

/**
 * @since 1.0.0
 * @category Address
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/SingletonAddress")

/**
 * @since 1.0.0
 * @category Address
 */
export type TypeId = typeof TypeId

/**
 * Represents the unique address of an singleton within the cluster.
 *
 * @since 1.0.0
 * @category Address
 */
export class SingletonAddress extends Schema.Class<SingletonAddress>("@effect/cluster/SingletonAddress")({
  shardId: ShardId,
  name: Schema.NonEmptyTrimmedString
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;
  /**
   * @since 1.0.0
   */
  [Hash.symbol]() {
    return Hash.cached(this)(Hash.string(`${this.name}:${this.shardId.toString()}`))
  }
  /**
   * @since 1.0.0
   */
  [Equal.symbol](that: SingletonAddress): boolean {
    return this.name === that.name && this.shardId[Equal.symbol](that.shardId)
  }
}
