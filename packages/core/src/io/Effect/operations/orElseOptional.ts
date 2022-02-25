import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @tsplus fluent ets/Effect orElseOptional
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Effect<R, Option<E>, A>,
  that: LazyArg<Effect<R2, Option<E2>, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, Option<E | E2>, A | A2> {
  return self.catchAll((option) =>
    option.fold(that, (e) => Effect.failNow(Option.some<E | E2>(e)))
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
  that: LazyArg<Effect<R2, Option<E2>, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, Option<E>, A>) => self.orElseOptional(that)
}
