import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Applies the specified function to the values of the `HashSet`.
 *
 * @tsplus fluent ets/HashSet forEach
 */
export function forEach_<A>(self: HashSet<A>, f: (v: A) => void) {
  realHashSet(self)
  self._keyMap.forEachWithIndex((k) => {
    f(k)
  })
}

/**
 * Applies the specified function to the values of the `HashSet`.
 *
 * @ets_data_first forEach
 */
export function forEach<A>(f: (a: A) => void) {
  return (self: HashSet<A>): void => self.forEach(f)
}
