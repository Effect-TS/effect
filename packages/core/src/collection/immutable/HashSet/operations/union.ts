import { HashSet } from "../definition"

/**
 * Computes the set union `(`self` + `that`)` between this `HashSet` and the
 * specified `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @tsplus operator ets/HashSet |
 * @tsplus fluent ets/HashSet union
 */
export function union_<A>(self: HashSet<A>, that: Iterable<A>): HashSet<A> {
  const set = HashSet<A>()

  return set.mutate((_) => {
    self.forEach((a) => {
      _.add(a)
    })
    for (const a of that) {
      _.add(a)
    }
  })
}

/**
 * Computes the set union `(`self` + `that`)` between this `HashSet` and the
 * specified `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @ets_data_first union_
 */
export function union<A>(that: Iterable<A>) {
  return (self: HashSet<A>): HashSet<A> => self.union(that)
}
