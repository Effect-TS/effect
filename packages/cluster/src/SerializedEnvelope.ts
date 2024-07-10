import * as Envelope from "@effect/cluster/Envelope"
import * as SerializedMessage from "@effect/cluster/SerializedMessage"

/**
 * A special kind of Envelope that uses SerializedMessage, so can return either a SerializedValue success or a SerializedValue failure.
 *
 * @since 1.0.0
 * @category models
 */
export interface SerializedEnvelope extends Envelope.Envelope<SerializedMessage.SerializedMessage> {}

export const schema = Envelope.schema(SerializedMessage.schema)
