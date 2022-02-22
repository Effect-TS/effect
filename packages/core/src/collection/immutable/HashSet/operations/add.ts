import type { HashMapInternal } from "../../HashMap/operations/_internal/hashMap"
import type { HashSet } from "../definition"
import { HashSetInternal, realHashSet } from "./_internal/hashSet"

/**
 * Adds a value to the `HashSet`.
 *
 * @tsplus operator ets/HashSet +
 * @tsplus fluent ets/HashSet add
 */
export function add_<A>(self: HashSet<A>, value: A): HashSet<A> {
  realHashSet(self)
  return (self._keyMap as HashMapInternal<A, unknown>)._editable
    ? (self._keyMap.set(value, true), self)
    : new HashSetInternal(self._keyMap.set(value, undefined))
}

/**
 * Adds a value to the `HashSet`.
 *
 * @ets_data_first add_
 */
export function add<A>(value: A) {
  return (self: HashSet<A>): HashSet<A> => self.add(value)
}
