/**
 * @since 1.0.0
 */
import { makeWithExecute } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = makeWithExecute

export type * from "./patch.types.js"
