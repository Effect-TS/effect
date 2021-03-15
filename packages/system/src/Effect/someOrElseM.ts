// tracing: off

import { constant, pipe } from "../Function"
import * as O from "../Option"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @dataFirst someOrElseM_
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
