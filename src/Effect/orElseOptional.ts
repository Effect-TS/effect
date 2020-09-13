import { flow, pipe } from "../Function"
import * as O from "../Option"
import { catchAll } from "./catchAll"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional<S2, R2, E2, A2>(
  that: () => Effect<S2, R2, O.Option<E2>, A2>
) {
  return <S, R, E, A>(self: Effect<S, R, O.Option<E>, A>) => orElseOptional_(self, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, O.Option<E>, A>,
  that: () => Effect<S2, R2, O.Option<E2>, A2>
): Effect<S | S2, R & R2, O.Option<E | E2>, A | A2> {
  return pipe(
    self,
    catchAll<S2, R2, O.Option<E | E2>, O.Option<E | E2>, A2>(
      O.fold(that, flow(O.some, fail))
    )
  )
}
