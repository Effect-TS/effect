/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import type { Effect } from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type * as PrimaryKey from "effect/PrimaryKey"
import { EntityAddress } from "./EntityAddress.js"

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
export interface Envelope<in out Msg extends Envelope.AnyMessage> extends Envelope.Proto {
  readonly address: EntityAddress
  readonly message: Msg
}

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyMessage = Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded {
    readonly address: typeof EntityAddress.Encoded
    readonly message: unknown
  }
}

const variance = {
  _R: (_: never) => _
}

const Proto = {
  address: undefined,
  message: undefined,
  [TypeId]: variance
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnvelope = (u: unknown): u is Envelope<Envelope.AnyMessage> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Msg extends Envelope.AnyMessage>(
  address: EntityAddress,
  message: Msg
): Envelope<Msg> =>
  Object.assign(Object.create(Proto), {
    address,
    message
  })

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serialize = <Msg extends Envelope.AnyMessage>(
  envelope: Envelope<Msg>
): Effect<
  Envelope.Encoded,
  ParseError,
  Serializable.Serializable.Context<Msg>
> => {
  const schema = Schema.Struct({
    address: EntityAddress,
    message: Serializable.selfSchema(envelope.message)
  })
  return Schema.encode(schema)(envelope)
}
