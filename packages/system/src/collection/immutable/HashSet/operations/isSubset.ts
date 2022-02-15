import type { HashSet } from "../definition"

/**
 * Returns `true` if and only if every element in the this `HashSet` is an
 * element of the second set,
 *
 * **NOTE**: the hash and equal of both sets must be the same.
 *
 * @tsplus fluent ets/HashSet isSubset
 */
export function isSubset_<A>(self: HashSet<A>, that: HashSet<A>): boolean {
  return self.every((a) => that.has(a))
}

/**
 * Returns `true` if and only if every element in the this `HashSet` is an
 * element of the second set,
 *
 * **NOTE**: the hash and equal of both sets must be the same.
 *
 * @ets_data_first isSubset_
 */
export function isSubset<A>(that: HashSet<A>) {
  return (self: HashSet<A>): boolean => self.isSubset(that)
}
