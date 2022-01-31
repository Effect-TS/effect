// ets_tracing: off

import { map_ as mapCause } from "../Cause/index.js"
import * as O from "../Option/index.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 */
export function head<R, E, A>(
  self: Effect<R, E, Iterable<A>>,
  __trace?: string
): Effect<R, O.Option<E>, A> {
  return foldCauseM_(
    self,
    (x) => halt(mapCause(x, O.some)),
    (x) => {
      const it = x[Symbol.iterator]()
      const next = it.next()
      return next.done ? fail(O.none) : succeed(next.value)
    },
    __trace
  )
}
