/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/EntityType")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category constructors
 */
export const EntityType = Schema.NonEmptyString.pipe(
  Schema.annotations({ identifier: "EntityType" })
)

/**
 * @since 1.0.0
 * @category models
 */
export type EntityType = Schema.Schema.Type<typeof EntityType>
