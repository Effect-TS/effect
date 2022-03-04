import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @tsplus fluent ets/STM orElseOptional
 */
export function orElseOptional_<R, E, A, R1, E1, A1>(
  self: STM<R, Option<E>, A>,
  that: LazyArg<STM<R1, Option<E1>, A1>>
): STM<R & R1, Option<E | E1>, A | A1> {
  return self.catchAll((option) =>
    option.fold(that, (e) => STM.fail(Option.some<E | E1>(e)))
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R1, E1, A1>(that: LazyArg<STM<R1, Option<E1>, A1>>) {
  return <R, E, A>(self: STM<R, Option<E>, A>): STM<R & R1, Option<E | E1>, A | A1> =>
    self.orElseOptional(that)
}
