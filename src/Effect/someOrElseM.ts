import { constant, flow, pipe } from "../Function"
import * as O from "../Option"
import { chain, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM<R2, E2, B>(orElse: Effect<R2, E2, B>) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrElseM_(self, orElse)
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM_<R, E, A, R2, E2, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: Effect<R2, E2, B>
): Effect<R & R2, E | E2, A | B> {
  return pipe(
    self as Effect<R, E, O.Option<A | B>>,
    chain(flow(O.map(succeed), O.getOrElse(constant(orElse))))
  )
}
