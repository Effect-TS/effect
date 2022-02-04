import type { HashSet } from "../definition"

/**
 * Mutates the `HashSet` within the context of the provided function.
 *
 * @tsplus fluent ets/HashSet mutate
 */
export function mutate_<A>(self: HashSet<A>, f: (set: HashSet<A>) => void): HashSet<A> {
  const transient = self.beginMutation()
  f(transient)
  return transient.endMutation()
}

/**
 * Mutates the `HashSet` within the context of the provided function.
 *
 * @ets_data_first mutate_
 */
export function mutate<A>(f: (self: HashSet<A>) => void) {
  return (self: HashSet<A>): HashSet<A> => self.mutate(f)
}
