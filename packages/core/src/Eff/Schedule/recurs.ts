import { forever } from "./forever"
import { whileOutput_ } from "./whileOutput"

/**
 * A schedule that recurs the specified number of times. Returns the number
 * of repetitions so far.
 *
 * If 0 or negative numbers are given, the operation is not repeated at all.
 */
export const recurs = (n: number) => whileOutput_(forever, (k) => k < n)
