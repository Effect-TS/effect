import type { HashSet } from "../definition"

/**
 * Computes the set difference `(`self` - `that`)` between this `HashSet` and
 * the specified `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @tsplus operator ets/HashSet -
 * @tsplus fluent ets/HashSet difference
 */
export function difference_<A>(self: HashSet<A>, that: Iterable<A>): HashSet<A> {
  return self.mutate((s) => {
    for (const k of that) {
      s.remove(k)
    }
  })
}

/**
 * Computes the set difference `(`self` - `that`)` between this `HashSet` and
 * the specified `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @ets_data_first difference_
 */
export function difference<A>(that: Iterable<A>) {
  return (self: HashSet<A>): HashSet<A> => self.difference(that)
}
