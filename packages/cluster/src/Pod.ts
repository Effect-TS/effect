/**
 * @since 1.0.0
 */
import * as Pretty from "effect/Pretty"
import * as Schema from "effect/Schema"
import { PodAddress } from "./PodAddress.js"

const SymbolKey = "@effect/cluster/Pod"

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
 * A `Pod` represents a physical application server that is capable of running
 * entities.
 *
 * Because a pod represents a physical application server, a pod must have a
 * unique `address` which can be used to communicate with the server.
 *
 * The version of a pod is used during rebalancing to give priority to newer
 * application servers and slowly decommission older ones.
 *
 * @since 1.0.0
 * @category models
 */
export class Pod extends Schema.Class<Pod>(SymbolKey)({
  address: PodAddress,
  version: Schema.Int
}) {
  /**
   * @since 1.0.0
   */
  static pretty = Pretty.make(this)

  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}
