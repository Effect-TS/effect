import { HashSet } from "../definition"

/**
 * @tsplus static ets/HashSetOps empty
 */
export function empty<A>(): HashSet<A> {
  return HashSet()
}
