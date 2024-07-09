import * as Message from "@effect/cluster/Message"
import * as SerializedValue from "@effect/cluster/SerializedValue"
import * as Schema from "@effect/schema/Schema"

const SerializedMessageSymbolKey = "@effect/cluster/SerializedMessage"

/**
 * @since 1.0.0
 * @category models
 */
export class SerializedMessage extends Message.TaggedMessage<SerializedMessage>()(
  SerializedMessageSymbolKey,
  SerializedValue.schema,
  SerializedValue.schema,
  { body: SerializedValue.schema, messageId: Schema.String },
  (_) => _.messageId
) {}

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
