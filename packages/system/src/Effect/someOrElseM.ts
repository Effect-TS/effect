import { constant, flow, pipe } from "../Function"
import * as O from "../Option"
import { chain, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM<S2, R2, E2, B>(orElse: Effect<S2, R2, E2, B>) {
  return <S, R, E, A>(self: Effect<S, R, E, O.Option<A>>) => someOrElseM_(self, orElse)
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM_<S, R, E, A, S2, R2, E2, B>(
  self: Effect<S, R, E, O.Option<A>>,
  orElse: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, A | B> {
  return pipe(
    self as Effect<S, R, E, O.Option<A | B>>,
    chain(flow(O.map(succeed), O.getOrElse(constant(orElse))))
  )
}
