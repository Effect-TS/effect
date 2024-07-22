/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as SerializedValue from "./SerializedValue.js"

const SerializedMessageSymbolKey = "@effect/cluster/SerializedMessage"

/**
 * @since 1.0.0
 * @category models
 */
export class SerializedMessage extends Schema.TaggedRequest<SerializedMessage>()(
  SerializedMessageSymbolKey,
  SerializedValue.schema,
  SerializedValue.schema,
  { body: SerializedValue.schema }
) {
}

/**
 * @since 1.0.0
 * @category constructors
 */
export function make(body: SerializedValue.SerializedValue) {
  return new SerializedMessage({ body })
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = Schema.asSchema(SerializedMessage)
