import { HashSet } from "../definition"

/**
 * Returns a `HashSet` of values which are present in both this set and that
 * `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @tsplus fluent ets/HashSet intersection
 */
export function intersection_<A>(self: HashSet<A>, that: Iterable<A>): HashSet<A> {
  const set = HashSet<A>()
  return set.mutate((_) => {
    for (const k of that) {
      if (self.has(k)) {
        _.add(k)
      }
    }
  })
}

/**
 * Returns a `HashSet` of values which are present in both this set and that
 * `Iterable<A>`.
 *
 * **NOTE**: the hash and equal of the values in both the set and the iterable
 * must be the same.
 *
 * @ets_data_first intersection_
 */
export function intersection<A>(that: Iterable<A>) {
  return (self: HashSet<A>) => self.intersection(that)
}
