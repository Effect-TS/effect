import type { Ord } from "./Ord"
import { fromCompare } from "./fromCompare"

/**
 * @since 2.0.0
 */
export function getDualOrd<A>(O: Ord<A>): Ord<A> {
  return fromCompare((x, y) => O.compare(y, x))
}
