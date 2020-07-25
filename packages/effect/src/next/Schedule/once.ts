import { recurs } from "./recurs"
import { unit } from "./unit"

/**
 * A schedule that executes once.
 */
export const once = unit(recurs(1))
