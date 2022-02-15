import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Reduces the specified state over the values of the `HashSet`.
 *
 * @tsplus fluent ets/HashSet reduce
 */
export function reduce_<V, Z>(self: HashSet<V>, z: Z, f: (z: Z, v: V) => Z): Z {
  realHashSet(self)
  return self._keyMap.reduceWithIndex(z, (z, v) => f(z, v))
}

/**
 * Reduces the specified state over the values of the `HashSet`.
 *
 * @ets_data_first reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return (self: HashSet<V>): Z => self.reduce(z, f)
}
