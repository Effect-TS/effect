import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Returns an `IterableIterator` of the values in the `HashSet`.
 *
 * @tsplus fluent ets/HashSet values
 */
export function values<A>(self: HashSet<A>): IterableIterator<A> {
  realHashSet(self)
  return self._keyMap.keys()
}
