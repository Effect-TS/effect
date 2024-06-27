/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import { TypeIdSchema } from "./internal/utils.js"

/** @internal */
const SerializedValueSymbolKey = "@effect/cluster/SerializedValue"

/**
 * @since 1.0.0
 * @category symbols
 */
export const SerializedValueTypeId: unique symbol = Symbol.for(SerializedValueSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type SerializedValueTypeId = typeof SerializedValueTypeId

/** @internal */
const SerializedValueTypeIdSchema = TypeIdSchema(SerializedValueSymbolKey, SerializedValueTypeId)

/**
 * Represents a Message that has been serialized.
 *
 * @since 1.0.0
 * @category models
 */
export class SerializedValue extends Schema.Class<SerializedValue>(SerializedValueSymbolKey)({
  [SerializedValueTypeId]: Schema.propertySignature(SerializedValueTypeIdSchema).pipe(
    Schema.fromKey(SerializedValueSymbolKey)
  ),
  value: Schema.String
}){}

/**
 * @since 1.0.0
 * @category models
 */
export namespace SerializedValue {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof SerializedValue> {}
}

/**
 * Construct a new `SerializedValue` from its internal string value.
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(value: string): SerializedValue {
  return new SerializedValue({ [SerializedValueTypeId]: SerializedValueTypeId, value })
}

/**
 * @since 1.0.0
 * @category utils
 */
export function isSerializedValue(value: unknown): value is SerializedValue {
  return (
    typeof value === "object" &&
    value !== null &&
    SerializedValueTypeId in value &&
    value[SerializedValueTypeId] === SerializedValueTypeId
  )
}

/**
 * This is the schema for a value.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  SerializedValue,
  SerializedValue.Encoded
> = Schema.asSchema(SerializedValue)
