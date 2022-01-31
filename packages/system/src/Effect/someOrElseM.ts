// ets_tracing: off

import { constant, pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseM_
 */
export function someOrElseM<R2, E2, B>(orElse: Effect<R2, E2, B>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) =>
    someOrElseM_(self, orElse, __trace)
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM_<R, E, A, R2, E2, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: Effect<R2, E2, B>,
  __trace?: string
): Effect<R & R2, E | E2, A | B> {
  return chain_(
    self as Effect<R, E, O.Option<A | B>>,
    (x) => pipe(x, O.map(succeed), O.getOrElse(constant(orElse))),
    __trace
  )
}
