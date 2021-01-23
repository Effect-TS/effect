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
export function orElseOptional<R2, E2, A2>(that: () => Effect<R2, O.Option<E2>, A2>) {
  return <R, E, A>(self: Effect<R, O.Option<E>, A>) => orElseOptional_(self, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Effect<R, O.Option<E>, A>,
  that: () => Effect<R2, O.Option<E2>, A2>
): Effect<R & R2, O.Option<E | E2>, A | A2> {
  return pipe(
    self,
    catchAll<R2, O.Option<E | E2>, O.Option<E | E2>, A2>(
      O.fold(that, flow(O.some, fail))
    )
  )
}
