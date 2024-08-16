/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category constructors
 */
export const EntityType = Schema.NonEmptyTrimmedString.pipe(Schema.brand("EntityType"))

/**
 * @since 1.0.0
 * @category models
 */
export type EntityType = typeof EntityType.Type
