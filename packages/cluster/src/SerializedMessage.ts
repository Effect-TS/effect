/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Message from "./Message.js"
import { TypeIdSchema } from "./internal/utils.js"
import * as SerializedValue from "./SerializedValue.js"

/** @internal */
const SerializedMessageSymbolKey = "@effect/cluster/SerializedMessage"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SerializedMessageTypeId: unique symbol = Symbol.for(SerializedMessageSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type SerializedMessageTypeId = typeof SerializedMessageTypeId

/** @internal */
const SerializedMessageTypeIdSchema = TypeIdSchema(SerializedMessageSymbolKey, SerializedMessageTypeId)

/**
 * Represents a Message that has been serialized.
 *
 * @since 1.0.0
 * @category models
 */
export class SerializedMessage extends Message.TaggedMessage<SerializedMessage>()(SerializedMessageSymbolKey, SerializedValue.SerializedValue, SerializedValue.SerializedValue, {
  [SerializedMessageTypeId]: Schema.propertySignature(SerializedMessageTypeIdSchema).pipe(
    Schema.fromKey(SerializedMessageSymbolKey)
  ),
  messageId: Schema.String,
  value: SerializedValue.SerializedValue
}, _ => _.messageId){}

/**
 * @since 1.0.0
 * @category models
 */
export namespace SerializedMessage {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof SerializedMessage> {}
}

/**
 * Construct a new `SerializedMessage` from its internal string value.
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(messageId: string, value: SerializedValue.SerializedValue): SerializedMessage {
  return new SerializedMessage({ [SerializedMessageTypeId]: SerializedMessageTypeId, messageId, value })
}

/**
 * @since 1.0.0
 * @category utils
 */
export function isSerializedMessage(value: unknown): value is SerializedMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    SerializedMessageTypeId in value &&
    value[SerializedMessageTypeId] === SerializedMessageTypeId
  )
}

/**
 * This is the schema for a value.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  SerializedMessage,
  SerializedMessage.Encoded
> = Schema.asSchema(SerializedMessage)
