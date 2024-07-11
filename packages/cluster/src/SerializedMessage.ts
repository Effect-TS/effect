import * as Schema from "@effect/schema/Schema"
import * as PrimaryKey from "effect/PrimaryKey"
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
  { body: SerializedValue.schema, messageId: Schema.String }
) {
  [PrimaryKey.symbol]() {
    return this.messageId
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export function make(messageId: string, body: SerializedValue.SerializedValue) {
  return new SerializedMessage({ messageId, body })
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = Schema.asSchema(SerializedMessage)
