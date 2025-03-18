/**
 * @since 1.0.0
 */
import { NodeInspectSymbol } from "effect/Inspectable"
import * as Pretty from "effect/Pretty"
import * as Schema from "effect/Schema"
import { RunnerAddress } from "./RunnerAddress.js"

const SymbolKey = "@effect/cluster/Runner"

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
 * A `Runner` represents a physical application server that is capable of running
 * entities.
 *
 * Because a Runner represents a physical application server, a Runner must have a
 * unique `address` which can be used to communicate with the server.
 *
 * The version of a Runner is used during rebalancing to give priority to newer
 * application servers and slowly decommission older ones.
 *
 * @since 1.0.0
 * @category models
 */
export class Runner extends Schema.Class<Runner>(SymbolKey)({
  address: RunnerAddress,
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

  /**
   * @since 1.0.0
   */
  static readonly decodeSync = Schema.decodeSync(Schema.parseJson(Runner))

  /**
   * @since 1.0.0
   */
  static readonly encodeSync = Schema.encodeSync(Schema.parseJson(Runner));

  /**
   * @since 1.0.0
   */
  [NodeInspectSymbol](): string {
    return this.toString()
  }
}

/**
 * A `Runner` represents a physical application server that is capable of running
 * entities.
 *
 * Because a Runner represents a physical application server, a Runner must have a
 * unique `address` which can be used to communicate with the server.
 *
 * The version of a Runner is used during rebalancing to give priority to newer
 * application servers and slowly decommission older ones.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = (props: {
  readonly address: RunnerAddress
  readonly version: number
}): Runner => new Runner(props)
