import type { Predicate } from "../../../../data/Function"
import type { Chunk } from "../definition"

/**
 * Returns the first index for which the given predicate is satisfied.
 *
 * @tsplus fluent ets/Chunk indexWhere
 */
export function indexWhere_<A>(self: Chunk<A>, f: Predicate<A>): number {
  return self.indexWhereFrom(0, f)
}

/**
 * Returns the first index for which the given predicate is satisfied.
 *
 * @ets_data_first indexWhere_
 */
export function indexWhere<A>(f: Predicate<A>) {
  return (self: Chunk<A>): number => self.indexWhere(f)
}
