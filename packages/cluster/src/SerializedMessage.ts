/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as SerializedValue from "./SerializedValue.js"

/**
 * @since 1.0.0
 * @category models
 */
export class SerializedMessage extends Schema.TaggedRequest<SerializedMessage>()(
  "@effect/cluster/SerializedMessage",
  {
    success: SerializedValue.schema,
    failure: SerializedValue.schema,
    payload: { body: SerializedValue.schema }
  }
) {}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = Schema.asSchema(SerializedMessage)
