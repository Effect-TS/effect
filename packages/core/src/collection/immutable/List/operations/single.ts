import { List } from "../definition"

/**
 * Takes a single arguments and returns a singleton list that contains it.
 *
 * @complexity O(1)
 * @tsplus static ets/ListOps single
 */
export function single<A>(a: A): List<A> {
  return List(a)
}
