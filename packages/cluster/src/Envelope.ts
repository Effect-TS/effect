/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import type { PrimaryKey } from "effect/PrimaryKey"
import type * as Request from "effect/Request"
import * as Schema from "effect/Schema"
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
  export interface AnyMessage
    extends PrimaryKey, Schema.TaggedRequest<string, any, any, any, any, any, any, any, unknown>
  {
    [Request.RequestTypeId]: any
    [Schema.symbolSerializable]: any
    [Schema.symbolWithResult]: any
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface AnyMessageSchema {
    readonly [Schema.TypeId]: any
    readonly Type: AnyMessage
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded {
    readonly address: typeof EntityAddress.Encoded
    readonly message: unknown
  }
}

const Proto = {
  [TypeId]: TypeId,
  address: undefined,
  message: undefined
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
  Schema.Serializable.Context<Msg>
> => {
  const schema = Schema.Struct({
    address: EntityAddress,
    message: Schema.serializableSchema(envelope.message)
  })
  return Schema.encode(schema)(envelope) as any
}
