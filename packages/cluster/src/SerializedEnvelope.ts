/**
 * @since 1.0.0
 */
import * as Envelope from "./Envelope.js"
import * as SerializedMessage from "./SerializedMessage.js"

/**
 * A special kind of Envelope that uses SerializedMessage, so can return either a SerializedValue success or a SerializedValue failure.
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
