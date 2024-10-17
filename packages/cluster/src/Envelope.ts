/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Data from "effect/Data"
import type * as Equal from "effect/Equal"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"
import { RecipientAddress } from "./RecipientAddress.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Envelope")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * An `Envelope` represents a serializable container for a request that will be
 * sent to an entity.
 *
 * The primary key of an `Envelope` provides the full address of the entity to
 * which the request should be sent, as well as the identifier of the request,
 * in the format: `<request-identifier>@<recipient-type>#<entity-identifier>`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Envelope<Msg extends Schema.TaggedRequest.Any>
  extends
    Equal.Equal,
    PrimaryKey.PrimaryKey,
    Serializable.SerializableWithResult<
      Envelope<Msg>,
      Envelope.Encoded<Serializable.Serializable.Encoded<Msg>>,
      Serializable.Serializable.Context<Msg>,
      Serializable.WithResult.Success<Msg>,
      Serializable.WithResult.SuccessEncoded<Msg>,
      Serializable.WithResult.Failure<Msg>,
      Serializable.WithResult.FailureEncoded<Msg>,
      Serializable.WithResult.Context<Msg>
    >,
    Envelope.Proto<Msg>
{}

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<Msg extends Schema.TaggedRequest.Any> {
    readonly [TypeId]: TypeId
    readonly address: RecipientAddress
    readonly messageId: string
    readonly message: Msg
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded<IA> {
    readonly address: RecipientAddress.Encoded
    readonly messageId: string
    readonly message: IA
  }
}

const Proto = Data.unsafeStruct({
  address: undefined,
  message: undefined,
  messageId: undefined,
  [TypeId]: TypeId,
  [PrimaryKey.symbol](this: Envelope<any>) {
    return (
      this.messageId +
      "@" +
      this.address.entityType +
      "#" +
      this.address.entityId
    )
  },
  get [Serializable.symbol]() {
    return schema(Serializable.selfSchema(this.message as any))
  },
  get [Serializable.symbolResult]() {
    return {
      Failure: Serializable.failureSchema((this as any).message),
      Success: Serializable.successSchema((this as any).message)
    }
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Msg extends Schema.TaggedRequest.Any>(
  address: RecipientAddress,
  messageId: string,
  message: Msg
): Envelope<Msg> => {
  const envelope = Object.create(Proto)
  envelope.address = address
  envelope.messageId = messageId
  envelope.message = message
  return envelope
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnvelope = (u: unknown): u is Envelope<
  Schema.TaggedRequest.Any
> => Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category mapping
 */
export const map = dual<
  <A extends Schema.TaggedRequest.Any, B extends Schema.TaggedRequest.Any>(
    f: (value: A) => B
  ) => (
    self: Envelope<A>
  ) => Envelope<B>,
  <A extends Schema.TaggedRequest.Any, B extends Schema.TaggedRequest.Any>(
    self: Envelope<A>,
    f: (value: A) => B
  ) => Envelope<B>
>(2, (self, f) => make(self.address, self.messageId, f(self.message)))

const envelopeParse = <A extends Schema.TaggedRequest.Any, R>(
  decodeUnknown: ParseResult.DecodeUnknown<Envelope.Encoded<A>, R>
): ParseResult.DeclarationDecodeUnknown<Envelope<A>, R> =>
(u, options, ast) =>
  isEnvelope(u) ?
    ParseResult.mapBoth(decodeUnknown(u, options), {
      onFailure: (e) => new ParseResult.Composite(ast, u, e),
      onSuccess: (e) => make(e.address, e.messageId, e.message)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Envelope$<A extends Schema.Schema.Any> extends
  Schema.AnnotableClass<
    Envelope$<A>,
    Envelope<Schema.Schema.Type<A>>,
    Envelope.Encoded<Schema.Schema.Encoded<A>>,
    Schema.Schema.Context<A>
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export interface EnvelopeFromSelf<Value extends Schema.Schema.Any> extends
  Schema.AnnotableClass<
    EnvelopeFromSelf<Value>,
    Envelope<Schema.Schema.Type<Value>>,
    Envelope<Schema.Schema.Encoded<Value>>,
    Schema.Schema.Context<Value>
  >
{}

const Envelope$ = <A extends Schema.Schema.Any>(message: A) =>
  Schema.Struct({
    address: RecipientAddress,
    messageId: Schema.String,
    message
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const EnvelopeFromSelf = <Value extends Schema.Schema.Any>(
  value: Value
): EnvelopeFromSelf<Value> => {
  return Schema.declare(
    [value],
    {
      decode: (item) => envelopeParse(ParseResult.decodeUnknown(Envelope$(item))),
      encode: (item) => envelopeParse(ParseResult.encodeUnknown(Envelope$(item)))
    },
    {}
  )
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = <A extends Schema.Schema.Any>(message: A): Envelope$<A> =>
  Schema.transform(
    Envelope$(Schema.asSchema(message)),
    EnvelopeFromSelf(Schema.typeSchema(message)),
    {
      strict: true,
      decode: (_) => make(_.address, _.messageId, _.message),
      encode: (_) => ({ address: _.address, messageId: _.messageId, message: _.message })
    }
  )
