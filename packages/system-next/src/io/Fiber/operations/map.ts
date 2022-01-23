import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { mapEffect_ } from "./mapEffect"

/**
 * Maps over the value the Fiber computes.
 */
export function map_<E, A, B>(self: Fiber<E, A>, f: (a: A) => B): Fiber<E, B> {
  return mapEffect_(self, (a) => T.succeedNow(f(a)))
}

/**
 * Maps over the value the Fiber computes.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(self: Fiber<E, A>): Fiber<E, B> => map_(self, f)
}
