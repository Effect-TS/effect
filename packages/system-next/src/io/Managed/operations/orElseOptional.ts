import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @tsplus fluent ets/Managed orElseOptional
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Managed<R, Option<E>, A>,
  that: LazyArg<Managed<R2, Option<E2>, A2>>,
  __etsTrace?: string
): Managed<R & R2, Option<E | E2>, A | A2> {
  return self.catchAll((_) =>
    _.fold(that, (e) => Managed.failNow(Option.some<E | E2>(e)))
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
  that: LazyArg<Managed<R2, Option<E2>, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, Option<E>, A>) => orElseOptional_(self, that)
}
