import type { HashMapInternal } from "../../HashMap/operations/_internal/hashMap"
import type { HashSet } from "../definition"
import { HashSetInternal, realHashSet } from "./_internal/hashSet"

/**
 * Removes a value from the `HashSet`.
 *
 * @tsplus fluent ets/HashSet remove
 */
export function remove_<A>(self: HashSet<A>, value: A): HashSet<A> {
  realHashSet(self)
  return (self._keyMap as HashMapInternal<A, unknown>)._editable
    ? (self._keyMap.remove(value), self)
    : new HashSetInternal(self._keyMap.remove(value))
}

/**
 * Removes a value from the `HashSet`.
 *
 * @ets_data_first remove_
 */
export function remove<A>(value: A) {
  return (self: HashSet<A>): HashSet<A> => self.remove(value)
}
