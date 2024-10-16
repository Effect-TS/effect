/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"

/** @internal */
const PodAddressSymbolKey = "@effect/cluster/PodAddress"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PodAddressTypeId: unique symbol = Symbol.for(PodAddressSymbolKey)

/** @internal */
export const PodAddressTypeIdSchema = TypeIdSchema(PodAddressSymbolKey, PodAddressTypeId)

/**
 * @since 1.0.0
 * @category symbols
 */
export type PodAddressTypeId = typeof PodAddressTypeId

/**
 * A PodAddress is a unique identifier of a Pod (application server).
 * It is conventially built by using an address and a port, so that messaging implementations may use directly the
 * PodAddress to know how to connect to the specific Pod.
 *
 * @since 1.0.0
 * @category models
 */
export class PodAddress extends Schema.Class<PodAddress>(PodAddressSymbolKey)({
  [PodAddressTypeId]: Schema.propertySignature(PodAddressTypeIdSchema).pipe(Schema.fromKey(PodAddressSymbolKey)),
  host: Schema.String,
  port: Schema.Number
}) {
  /**
   * @since 1.0.0
   */
  toString() {
    return `PodAddress(${this.host}:${this.port})`
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace PodAddress {
  /**
   * This is the shape one PodAddress has over the wire.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof PodAddress> {}
}

/**
 * Constructs a PodAddress from an host and a port.
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(host: string, port: number): PodAddress {
  return new PodAddress({ [PodAddressTypeId]: PodAddressTypeId, host, port })
}

/**
 * Ensures that the given value is a valid PodAddress.
 *
 * @since 1.0.0
 * @category utils
 */
export function isPodAddress(value: unknown): value is PodAddress {
  return (
    typeof value === "object" &&
    value !== null &&
    PodAddressTypeId in value &&
    value[PodAddressTypeId] === PodAddressTypeId
  )
}

/**
 * This is the schema for a PodAddress.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  PodAddress,
  PodAddress.Encoded
> = Schema.asSchema(PodAddress)
