// ets_tracing: off

import type { Effect } from "../../Effect"
import { succeed } from "../../Effect"
import type { Exit } from "../definition"

/**
 * Effectually flat maps over the value type.
 */
export function chainEffect_<E, A, R, E1, A1>(
  self: Exit<E, A>,
  f: (a: A) => Effect<R, E1, Exit<E, A1>>
): Effect<R, E1, Exit<E1, A1>> {
  switch (self._tag) {
    case "Failure":
      return succeed(self)
    case "Success":
      return f(self.value)
  }
}

/**
 * Effectually flat maps over the value type.
 *
 * @ets_data_first chainEffect_
 */
export function chainEffect<A, R, E1, E, A1>(f: (a: A) => Effect<R, E1, Exit<E, A1>>) {
  return (self: Exit<E, A>): Effect<R, E1, Exit<E1, A1>> => chainEffect_(self, f)
}
