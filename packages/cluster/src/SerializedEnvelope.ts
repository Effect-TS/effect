/**
 * @since 1.0.0
 */
import * as Envelope from "./Envelope.js"
import * as SerializedMessage from "./SerializedMessage.js"

/**
 * A `SerializedEnvelope` represents a special type of `Envelope` containing a
 * `SerializedMessage`.
 *
 * The serializable result of a `SerializedEnvelope` can return either a
 * `SerializedValue` representing success or a `SerializedValue` representing
 * failure.
 *
 * @since 1.0.0
 * @category models
 */
export interface SerializedEnvelope extends Envelope.Envelope<SerializedMessage.SerializedMessage> {}

/**
 * @since 1.0.0
 * @category schema
 */
export const schema = Envelope.schema(SerializedMessage.schema)
