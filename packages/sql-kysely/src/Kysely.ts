/**
 * @since 1.0.0
 */
import * as internal from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.makeWithExecute

/**
 * @since 1.0.0
 * @category types
 */
export type * from "./patch.types.js"
