import type { Predicate } from "../../../../data/Function"
import type { HashSet } from "../definition"

/**
 * Returns `true` only if all values in the `HashSet` match the specified
 * predicate.
 *
 * @tsplus fluent ets/HashSet every
 */
export function every_<A>(self: HashSet<A>, f: Predicate<A>): boolean {
  return !self.some((a) => !f(a))
}

/**
 * Returns `true` only if all values in the `HashSet` match the specified
 * predicate.
 *
 * @ets_data_first every_
 */
export function every<A>(f: Predicate<A>) {
  return (self: HashSet<A>): boolean => self.every(f)
}
