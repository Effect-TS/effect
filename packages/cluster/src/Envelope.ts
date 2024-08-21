/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
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
export interface Envelope<in out Msg extends Envelope.AnyMessage> extends
  Envelope.Proto,
  Serializable.Serializable<
    Envelope<Msg>,
    Envelope.Encoded,
    Serializable.Serializable.Context<Msg>
  >
{
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
  export type AnyMessage = Schema.TaggedRequest.All & PrimaryKey.PrimaryKey

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
  [TypeId]: variance,
  get [Serializable.symbol]() {
    return EnvelopeSchema(this.message as any)
  }
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

const envelopeEncoded = <Msg extends Envelope.AnyMessage>(
  message: Msg
) =>
  Schema.Struct({
    address: EntityAddress,
    message: Serializable.selfSchema(message)
  }).annotations({ title: "Envelope.Encoded" })

const envelopeParse = <Msg extends Envelope.AnyMessage>(
  decodeUnknownMessage: ParseResult.DecodeUnknown<Msg, never>
): ParseResult.DeclarationDecodeUnknown<Envelope<Msg>, never> =>
(u, options, ast) =>
  isEnvelope(u)
    ? ParseResult.mapBoth(decodeUnknownMessage(u.message, options), {
      onFailure: (e) => new ParseResult.Composite(ast, u, e),
      onSuccess: (message) => make(u.address, message)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @since 1.0.0
 * @category api interface
 */
export interface EnvelopeFromSelf<Msg extends Envelope.AnyMessage> extends
  Schema.AnnotableClass<
    EnvelopeFromSelf<Msg>,
    Envelope<Msg>,
    Envelope<Msg>,
    Schema.Schema.Context<Msg>
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const EnvelopeFromSelf = <Msg extends Envelope.AnyMessage>(
  message: Msg
): EnvelopeFromSelf<Msg> => {
  const messageSchema = Serializable.selfSchema(message)
  return Schema.declare(
    [messageSchema],
    {
      decode: (message) => envelopeParse(ParseResult.decodeUnknown(message)),
      encode: (message) => envelopeParse(ParseResult.encodeUnknown(message))
    },
    {
      title: `Envelope<${messageSchema.ast}>`
    }
  )
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EnvelopeSchema<Msg extends Envelope.AnyMessage> extends
  Schema.AnnotableClass<
    EnvelopeSchema<Msg>,
    Envelope<Msg>,
    Envelope.Encoded,
    Schema.Schema.Context<Msg>
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const EnvelopeSchema = <Msg extends Envelope.AnyMessage>(
  message: Msg
): EnvelopeSchema<Msg> => {
  const message_ = Serializable.selfSchema(message)
  return Schema.transformOrFail(
    Schema.encodedSchema(envelopeEncoded(message)),
    EnvelopeFromSelf(message),
    {
      strict: true,
      decode: (encoded) => {
        const decodeAddress = ParseResult.decode(EntityAddress)
        const decodeMessage = ParseResult.decodeUnknown(message_)
        return Effect.all({
          address: decodeAddress(encoded.address),
          message: decodeMessage(encoded.message)
        }).pipe(Effect.map(({ address, message }) => make(address, message)))
      },
      encode: (envelope) => Effect.succeed({ address: envelope.address, message })
    }
  )
}
