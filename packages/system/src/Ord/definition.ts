import type { Equal } from "../Equal"
import type { Ordering } from "../Ordering"

/**
 * `Ord[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Ord<A> extends Equal<A> {
  readonly compare: (x: A, y: A) => Ordering
}
