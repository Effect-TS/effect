import type { Predicate } from "../../../../data/Function"
import type { HashSet } from "../definition"

/**
 * Returns `true` if any value in the `HashSet` matches the specified predicate.
 *
 * @tsplus fluent ets/HashSet some
 */
export function some_<A>(self: HashSet<A>, f: Predicate<A>): boolean {
  let found = false
  for (const v of self) {
    found = f(v)
    if (found) {
      break
    }
  }
  return found
}

/**
 * Returns `true` if any value in the `HashSet` matches the specified predicate.
 *
 * @ets_data_first some_
 */
export function some<A>(f: Predicate<A>) {
  return (self: HashSet<A>): boolean => self.some(f)
}
