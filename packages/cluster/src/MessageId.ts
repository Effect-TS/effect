/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category constructors
 */
export const MessageId = Schema.NonEmptyTrimmedString.pipe(Schema.brand("MessageId"))

/**
 * @since 1.0.0
 * @category models
 */
export type MessageId = typeof MessageId.Type
