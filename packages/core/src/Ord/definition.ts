// ets_tracing: off

import type { Equal } from "../Equal/index.js"
import type { Ordering } from "../Ordering/index.js"

/**
 * `Ord[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Ord<A> extends Equal<A> {
  readonly compare: (y: A) => (x: A) => Ordering
}
