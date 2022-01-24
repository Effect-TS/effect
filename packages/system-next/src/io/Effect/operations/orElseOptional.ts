import type { LazyArg } from "../../../data/Function"
import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { catchAll_ } from "./catchAll"
import { failNow } from "./failNow"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @ets fluent ets/Effect orElseOptional
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Effect<R, O.Option<E>, A>,
  that: LazyArg<Effect<R2, O.Option<E2>, A2>>,
  __trace?: string
): Effect<R & R2, O.Option<E | E2>, A | A2> {
  return catchAll_(
    self,
    O.fold(that, (e) => failNow(O.some<E | E2>(e))),
    __trace
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R2, E2, A2>(
  that: LazyArg<Effect<R2, O.Option<E2>, A2>>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, O.Option<E>, A>) =>
    orElseOptional_(self, that, __trace)
}
