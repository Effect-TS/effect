// ets_tracing: off

import type { Equal } from "../Equal/index.js"
import type { Ordering } from "../Ordering/index.js"
import type { HKT } from "../Prelude/index.js"

/**
 * `Ord[A]` provides implicit evidence that values of type `A` have a total
 * ordering.
 */
export interface Ord<A> extends Equal<A> {
  readonly compare: (y: A) => (x: A) => Ordering
}

export interface OrdF extends HKT {
  readonly type: Ord<this["A"]>
}
