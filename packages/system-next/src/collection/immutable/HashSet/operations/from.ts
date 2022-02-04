import { HashSet } from "../definition"

/**
 * Construct a new `HashSet` from an `Iterable` of values.
 *
 * @tsplus static ets/HashSetOps from
 */
export function from<A>(items: Iterable<A>): HashSet<A> {
  const set = HashSet<A>().beginMutation()
  for (const v of items) {
    set.add(v)
  }
  return set.endMutation()
}
