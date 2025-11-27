/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category constructors
 */
export const EntityId = Schema.NonEmptyTrimmedString.pipe(Schema.brand("EntityId"))

/**
 * @since 1.0.0
 * @category models
 */
export type EntityId = typeof EntityId.Type

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (id: string): EntityId => id as EntityId
