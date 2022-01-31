import { pipe } from "../../../data/Function"
import * as O from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElseEffect
 */
export function someOrElseEffect_<R, E, A, R2, E2, B>(
  self: Effect<R, E, O.Option<A>>,
  orElse: Effect<R2, E2, B>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A | B> {
  return (self as Effect<R, E, O.Option<A | B>>).flatMap((_) =>
    pipe(
      O.map_(_, Effect.succeedNow),
      O.getOrElse(() => orElse)
    )
  )
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseEffect_
 */
export function someOrElseEffect<R2, E2, B>(
  orElse: Effect<R2, E2, B>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrElseEffect_(self, orElse)
}
