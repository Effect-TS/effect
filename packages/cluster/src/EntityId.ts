/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import { IntegerFromString } from "./internal/schemas.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/EntityId")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category constructors
 */
export const EntityId = IntegerFromString.pipe(
  Schema.brand(TypeId),
  Schema.annotations({ identifier: "EntityId" })
)

/**
 * @since 1.0.0
 * @category models
 */
export type EntityId = Schema.Schema.Type<typeof EntityId>
