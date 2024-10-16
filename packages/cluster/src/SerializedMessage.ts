/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"

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
export class SerializedMessage extends Schema.Class<SerializedMessage>(SerializedMessageSymbolKey)({
  [SerializedMessageTypeId]: Schema.propertySignature(SerializedMessageTypeIdSchema).pipe(
    Schema.fromKey(SerializedMessageSymbolKey)
  ),
  value: Schema.String
}) {}

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
export function make(value: string): SerializedMessage {
  return new SerializedMessage({ [SerializedMessageTypeId]: SerializedMessageTypeId, value })
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
