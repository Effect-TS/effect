/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"
import * as PodAddress from "./PodAddress.js"

/** @internal */
const PodSymbolKey = "@effect/cluster/Pod"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PodTypeId: unique symbol = Symbol.for(PodSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type PodTypeId = typeof PodTypeId

/** @internal */
const PodTypeIdSchema = TypeIdSchema(PodSymbolKey, PodTypeId)

/**
 * A pod is an application server that is able to run entities. A pod can run multiple entities,
 * but a single entity will live on a given pod at a time.
 * Since this is an application server, it needs to have an unique identifier where it's addressed (PodAddress),
 * and has a version of the application that's running on it.
 * Version is used during the rebalance phase to give priority to newer application servers and slowly kill older ones.
 *
 * @since 1.0.0
 * @category models
 */
export class Pod extends Schema.Class<Pod>(PodSymbolKey)({
  [PodTypeId]: Schema.propertySignature(PodTypeIdSchema).pipe(Schema.fromKey(PodSymbolKey)),
  address: PodAddress.schema,
  version: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  toString() {
    return `Pod(${this.address}, ${this.version})`
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace Pod {
  /**
   * This is the shape that a Pod is represented over the wire.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof Pod> {}
}

/**
 * Given a value, ensures that it's a valid Pod.
 *
 * @since 1.0.0
 * @category utils
 */
export function isPod(value: unknown): value is Pod {
  return (
    typeof value === "object" &&
    value !== null &&
    PodTypeId in value &&
    value[PodTypeId] === PodTypeId
  )
}

/**
 * Constructs a Pod from it's identifing PodAddress and application server version.
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(address: PodAddress.PodAddress, version: string): Pod {
  return new Pod({ [PodTypeId]: PodTypeId, address, version })
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  Pod,
  Pod.Encoded
> = Schema.asSchema(Pod)
