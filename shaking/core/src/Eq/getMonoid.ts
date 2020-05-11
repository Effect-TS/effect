import type { Monoid } from "../Monoid"

import type { Eq } from "./Eq"
import { fromEquals } from "./fromEquals"

/**
 * @since 2.6.0
 */
export function getMonoid<A>(): Monoid<Eq<A>> {
  return {
    concat: (x, y) => fromEquals((a, b) => x.equals(a, b) && y.equals(a, b)),
    empty: {
      equals: () => true
    }
  }
}
