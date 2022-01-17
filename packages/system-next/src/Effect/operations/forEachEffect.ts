// ets_tracing: off

import * as O from "../../Option"
import type { Effect } from "../definition"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { map_ } from "./map"
import { none } from "./none"

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 */
export function forEachEffect_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __trace?: string
): Effect<R & R1, E | E1, O.Option<B>> {
  return foldCauseEffect_(
    self,
    () => none,
    (a) => map_(f(a), O.some),
    __trace
  )
}

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @ets_data_first forEachEffect_
 */
export function forEachEffect<A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, O.Option<B>> =>
    forEachEffect_(self, f, __trace)
}
