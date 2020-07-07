import { as_ } from "./as"
import { forever } from "./forever"

/**
 * A schedule that recurs forever, returning the constant for every output.
 */
export const succeed = <A>(a: A) => as_(forever, a)
