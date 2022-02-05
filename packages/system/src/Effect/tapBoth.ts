// ets_tracing: off

import { failureOrCause } from "../Cause/index.js"
import * as E from "../Either/index.js"
import { chain_, foldCauseM_, halt } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @ets_data_first tapBoth_
 */
export function tapBoth<E, A, R2, E2, R3, E3, X, Y>(
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, Y>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>) => tapBoth_(self, f, g, __trace)
}

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth_<R, E, A, R2, E2, R3, E3, X, Y>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, Y>,
  __trace?: string
) {
  return foldCauseM_(
    self,
    (c) =>
      E.fold_(
        failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    (a) => map_(g(a), () => a),
    __trace
  )
}
