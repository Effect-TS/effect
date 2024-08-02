/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"

/**
 * Represents a Message that has been serialized.
 *
 * @since 1.0.0
 * @category models
 */
export class SerializedValue extends Schema.Class<SerializedValue>(
  "@effect/cluster/SerializedValue"
)({ value: Schema.String }) {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace SerializedValue {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof SerializedValue> {}
}

/**
 * Represents the schema for a `SerializedValue`.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  SerializedValue,
  SerializedValue.Encoded
> = Schema.asSchema(SerializedValue)
