/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/MessageId")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category constructors
 */
export const MessageId = Schema.NonEmptyString.pipe(
  Schema.brand(TypeId),
  Schema.annotations({ identifier: "MessageId" })
)

/**
 * @since 1.0.0
 * @category models
 */
export type MessageId = Schema.Schema.Type<typeof MessageId>
