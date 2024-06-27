/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as PrimaryKey from "effect/PrimaryKey"
import { TypeIdSchema } from "./internal/utils.js"
import * as RecipientAddress from "./RecipientAddress.js"
import * as SerializedMessage from "./SerializedMessage.js"
import * as Data from "effect/Data"
import * as Message from "./Message.js"

/** @internal */
const EnvelopeSymbolKey = "@effect/cluster/Envelope"

/**
 * @since 1.0.0
 * @category symbols
 */
export const EnvelopeTypeId: unique symbol = Symbol.for(EnvelopeSymbolKey)

/** @internal */
const EnvelopeTypeIdSchema = TypeIdSchema(EnvelopeSymbolKey, EnvelopeTypeId)

/**
 * @since 1.0.0
 * @category symbols
 */
export type EnvelopeTypeId = typeof EnvelopeTypeId

/**
 * A Envelope is the message that goes over the wire between pods.
 * Inside the Envelope, you have the encoded messages, plus some informations on where it should be routed to.
 *
 * @since 1.0.0
 * @category models
 */
export class Envelope<A extends Message.Message.Any> extends Data.Class<{
    [EnvelopeTypeId]: EnvelopeTypeId,
    recipientAddress: RecipientAddress.RecipientAddress,
  body: A
}> implements Message.Message<Message.Message.Success<A>, Message.Message.SuccessEncoded<A>, Message.Message.Error<A>, Message.Message.ErrorEncoded<A>> {
  get [Serializable.symbol]() {
    return getSchema(Serializable.selfSchema(this.body))
  }

  get [Serializable.symbolResult]() {
    return this.body[Serializable.symbolResult] as any
  }

  [PrimaryKey.symbol]() {
    return PrimaryKey.value(this.body) + "@" + this.recipientAddress.recipientTypeName + "#" + this.recipientAddress.entityId
  }
}

function getSchema<A, IA>(bodySchema: Schema.Schema<A, IA, never>){
    return Schema.Struct({
        recipientAddress: RecipientAddress.RecipientAddress,
        body: bodySchema
    })  // WTF? how can this be transformed to an Envelope<A> instance smartly?
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof Envelope> {}
}

/**
 * Construct a new `Envelope`
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(
  recipientAddress: RecipientAddress.RecipientAddress,
  messageId: string,
  body: SerializedMessage.SerializedMessage
): Envelope {
  return new Envelope({
    [EnvelopeTypeId]: EnvelopeTypeId,
    messageId,
    recipientAddress,
    body
  })
}

/**
 * Ensures that the given value is a Envelope.
 *
 * @since 1.0.0
 * @category utils
 */
export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    EnvelopeTypeId in value &&
    value[EnvelopeTypeId] === EnvelopeTypeId
  )
}

/**
 * This is the schema for a value.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<Envelope, Envelope.Encoded, never> = Schema.asSchema(
  Envelope
)
