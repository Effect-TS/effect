import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Calculates the number of values in the `HashSet`.
 *
 * @tsplus getter ets/HashSet size
 */
export function size<A>(self: HashSet<A>): number {
  realHashSet(self)
  return self._keyMap.size
}
