/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import type * as PrimaryKey from "effect/PrimaryKey"
import { EntityAddress } from "./EntityAddress.js"
import { MessageId } from "./MessageId.js"

const SymbolKey = "@effect/cluster/Envelope"

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
export class Envelope extends Schema.Class<Envelope>(SymbolKey)({
  address: EntityAddress,
  message: Schema.Struct({
    id: MessageId,
    body: Schema.Unknown
  })
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  get [Serializable.symbol]() {
    return Envelope
  }
}

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyMessage = Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey
}
