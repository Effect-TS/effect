import type { Ord } from "./Ord"
import type { Ordering } from "./Ordering"

/**
 * @since 2.0.0
 */
export function fromCompare<A>(compare: (x: A, y: A) => Ordering): Ord<A> {
  const optimizedCompare = (x: A, y: A): Ordering => (x === y ? 0 : compare(x, y))
  return {
    equals: (x, y) => optimizedCompare(x, y) === 0,
    compare: optimizedCompare
  }
}
