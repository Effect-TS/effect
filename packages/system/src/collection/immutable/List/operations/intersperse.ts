import type { List } from "../definition"
import { MutableList } from "../definition"
import { pop } from "./pop"

/**
 * Inserts a separator between each element in a list.
 *
 * @tsplus fluent ets/List intersperse
 */
export function intersperse_<A>(self: List<A>, separator: A): List<A> {
  return pop(
    self.reduce(MutableList.emptyPushable(), (acc, a) => acc.push(a).push(separator))
  )
}

/**
 * Inserts a separator between each element in a list.
 *
 * @ets_data_first intersperse_
 */
export function intersperse<A>(separator: A) {
  return (self: List<A>): List<A> => self.intersperse(separator)
}
