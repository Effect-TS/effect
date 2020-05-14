import type { Monoid } from "../Monoid"
import type { Ord } from "../Ord"
import { foldMap as foldMap_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const foldMap: <A, M>(
  O: Ord<A>,
  M: Monoid<M>
) => (f: (a: A) => M) => (fa: Set<A>) => M = foldMap_1
