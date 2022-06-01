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
): STM<R | R1, Option<E | E1>, A | A1> {
  return self.catchAll((option) => option.fold(that, (e) => STM.fail(Option.some<E | E1>(e))))
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of the
 * specified effect.
 *
 * @tsplus static ets/STM/Aspects orElseOptional
 */
export const orElseOptional = Pipeable(orElseOptional_)
