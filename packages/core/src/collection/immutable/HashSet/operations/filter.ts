import type { Predicate, Refinement } from "../../../../data/Function"
import type { Next } from "../../Map"
import { HashSet } from "../definition"

/**
 * Filters values out of a `HashSet` using the specified predicate.
 *
 * @tsplus fluent ets/HashSet filter
 */
export function filter_<A, B extends A>(
  self: HashSet<A>,
  f: Refinement<A, B>
): HashSet<B>
export function filter_<A>(self: HashSet<A>, f: Predicate<A>): HashSet<A>
export function filter_<A>(self: HashSet<A>, f: Predicate<A>): HashSet<A> {
  const set = HashSet<A>()
  return set.mutate((r) => {
    const vs = self.values()
    let e: Next<A>
    while (!(e = vs.next()).done) {
      const value = e.value
      if (f(value)) {
        r.add(value)
      }
    }
  })
}

/**
 * Filters values out of a `HashSet` using the specified predicate.
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): (self: HashSet<A>) => HashSet<B>
export function filter<A>(f: Predicate<A>): (self: HashSet<A>) => HashSet<A>
export function filter<A>(f: Predicate<A>) {
  return (self: HashSet<A>): HashSet<A> => self.filter(f)
}
