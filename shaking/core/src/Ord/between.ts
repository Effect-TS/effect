import type { Ord } from "./Ord"
import { gt } from "./gt"
import { lt } from "./lt"

/**
 * Test whether a value is between a minimum and a maximum (inclusive)
 *
 * @since 2.0.0
 */
export function between<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => boolean {
  const lessThanO = lt(O)
  const greaterThanO = gt(O)
  return (low, hi) => (x) => (lessThanO(x, low) || greaterThanO(x, hi) ? false : true)
}
