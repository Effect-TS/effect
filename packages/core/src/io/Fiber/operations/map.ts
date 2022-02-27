import { Effect } from "../../Effect"
import type { Fiber } from "../definition"

/**
 * Maps over the value the Fiber computes.
 *
 * @tsplus fluent ets/Fiber map
 * @tsplus fluent ets/RuntimeFiber map
 */
export function map_<E, A, B>(self: Fiber<E, A>, f: (a: A) => B): Fiber<E, B> {
  return self.mapEffect((a) => Effect.succeedNow(f(a)))
}

/**
 * Maps over the value the Fiber computes.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(self: Fiber<E, A>): Fiber<E, B> => self.map(f)
}
