import type { Semigroup } from "../Semigroup"

import type { Ord } from "./Ord"
import { fromCompare } from "./fromCompare"
import { monoidOrdering } from "./monoidOrdering"

/**
 * Use `getMonoid` instead
 *
 * @since 2.0.0
 * @deprecated
 */
export function getSemigroup<A = never>(): Semigroup<Ord<A>> {
  return {
    concat: (x, y) =>
      fromCompare((a, b) => monoidOrdering.concat(x.compare(a, b), y.compare(a, b)))
  }
}
