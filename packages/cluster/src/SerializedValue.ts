/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Predicate from "effect/Predicate"
import { TypeIdSchema } from "./internal/utils.js"

/** @internal */
const SymbolKey = "@effect/cluster/SerializedValue"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId: unique symbol = Symbol.for(SymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type TypeId = typeof TypeId

/** @internal */
const SerializedMessageTypeIdSchema = TypeIdSchema(SymbolKey, TypeId)

/**
 * Represents a Message that has been serialized.
 *
 * @since 1.0.0
 * @category models
 */
export class SerializedValue extends Schema.Class<SerializedValue>(SymbolKey)({
  [TypeId]: Schema.propertySignature(SerializedMessageTypeIdSchema).pipe(
    Schema.fromKey(SymbolKey)
  ),
  value: Schema.String
}) {}

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
  return new SerializedValue({ [TypeId]: TypeId, value })
}

/**
 * @since 1.0.0
 * @category utils
 */
export function isSerializedValue(value: unknown): value is SerializedValue {
  return Predicate.isObject(value) && Predicate.hasProperty(value, TypeId)
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
