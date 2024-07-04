/**
 * @since 1.0.0
 */
import * as RecipientAddress from "@effect/cluster/RecipientAddress"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Data from "effect/Data"
import type * as Equal from "effect/Equal"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"

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
export interface Envelope<Req extends Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey>
  extends
    Equal.Equal,
    PrimaryKey.PrimaryKey,
    Serializable.SerializableWithResult<
      Envelope<Req>,
      {
        readonly address: Schema.Schema.Encoded<RecipientAddress.RecipientAddress>
        readonly message: Schema.Simplify<Schema.Schema.Encoded<Req[typeof Serializable.symbol]>>
      },
      Serializable.Serializable.Context<Req>,
      Serializable.WithResult.Success<Req>,
      Serializable.WithResult.SuccessEncoded<Req>,
      Serializable.WithResult.Error<Req>,
      Serializable.WithResult.ErrorEncoded<Req>,
      Serializable.WithResult.Context<Req>
    >,
    Envelope.Proto<Req>
{}

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<Req extends Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey> {
    readonly [TypeId]: TypeId
    readonly address: RecipientAddress.RecipientAddress
    readonly message: Req
  }
}

const EnvelopeProto = Data.unsafeStruct({
  address: undefined,
  message: undefined,
  [PrimaryKey.symbol](this: Envelope<any>) {
    return (
      PrimaryKey.value(this.message) +
      "@" +
      this.address.recipientTypeName +
      "#" +
      this.address.entityId
    )
  },
  get [Serializable.symbol]() {
    return Schema.Struct({
      address: RecipientAddress.RecipientAddress,
      message: Serializable.selfSchema((this as any).message)
    })
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
export const make = <Req extends Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey>(
  address: RecipientAddress.RecipientAddress,
  message: Req
): Envelope<Req> => {
  const envelope = Object.create(EnvelopeProto)
  envelope.address = address
  envelope.message = message
  return envelope
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnvelope = (u: unknown): u is Envelope<
  Schema.TaggedRequest.Any & PrimaryKey.PrimaryKey
> => Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)
