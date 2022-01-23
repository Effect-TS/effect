import { pipe } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets fluent ets/Effect someOrElseEffect
 */
export function someOrElseEffect_<R, E, A, R2, E2, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: Effect<R2, E2, B>,
  __trace?: string
): Effect<R & R2, E | E2, A | B> {
  return chain_(
    self as Effect<R, E, O.Option<A | B>>,
    (x) =>
      pipe(
        x,
        O.map(succeedNow),
        O.getOrElse(() => orElse)
      ),
    __trace
  )
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseEffect_
 */
export function someOrElseEffect<R2, E2, B>(
  orElse: Effect<R2, E2, B>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) =>
    someOrElseEffect_(self, orElse, __trace)
}
