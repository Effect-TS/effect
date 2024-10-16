/**
 * @since 1.0.0
 */
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"
import * as RecipientAddress from "./RecipientAddress.js"
import * as SerializedMessage from "./SerializedMessage.js"

/** @internal */
const SerializedEnvelopeSymbolKey = "@effect/cluster/SerializedEnvelope"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SerializedEnvelopeTypeId: unique symbol = Symbol.for(SerializedEnvelopeSymbolKey)

/** @internal */
const SerializedEnvelopeTypeIdSchema = TypeIdSchema(SerializedEnvelopeSymbolKey, SerializedEnvelopeTypeId)

/**
 * @since 1.0.0
 * @category symbols
 */
export type SerializedEnvelopeTypeId = typeof SerializedEnvelopeTypeId

/**
 * A SerializedEnvelope is the message that goes over the wire between pods.
 * Inside the Envelope, you have the encoded messages, plus some informations on where it should be routed to.
 *
 * @since 1.0.0
 * @category models
 */
export class SerializedEnvelope extends Schema.Class<SerializedEnvelope>(SerializedEnvelopeSymbolKey)({
  [SerializedEnvelopeTypeId]: Schema.propertySignature(SerializedEnvelopeTypeIdSchema).pipe(
    Schema.fromKey(SerializedEnvelopeSymbolKey)
  ),
  recipientAddress: RecipientAddress.RecipientAddress,
  messageId: Schema.String,
  body: SerializedMessage.schema
}) {
  get [Schema.symbolSerializable]() {
    return this.constructor
  }
  get [Schema.symbolWithResult]() {
    return { Success: Schema.Void, Failure: Schema.Never }
  }
  get [PrimaryKey.symbol]() {
    return this.messageId + "@" + this.recipientAddress.recipientTypeName + "#" + this.recipientAddress.entityId
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace SerializedEnvelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof SerializedEnvelope> {}
}

/**
 * Construct a new `SerializedEnvelope`
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(
  recipientAddress: RecipientAddress.RecipientAddress,
  messageId: string,
  body: SerializedMessage.SerializedMessage
): SerializedEnvelope {
  return new SerializedEnvelope({
    [SerializedEnvelopeTypeId]: SerializedEnvelopeTypeId,
    messageId,
    recipientAddress,
    body
  })
}

/**
 * Ensures that the given value is a SerializedEnvelope.
 *
 * @since 1.0.0
 * @category utils
 */
export function isSerializedEnvelope(value: unknown): value is SerializedEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    SerializedEnvelopeTypeId in value &&
    value[SerializedEnvelopeTypeId] === SerializedEnvelopeTypeId
  )
}

/**
 * This is the schema for a value.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<SerializedEnvelope, SerializedEnvelope.Encoded, never> = Schema.asSchema(
  SerializedEnvelope
)
