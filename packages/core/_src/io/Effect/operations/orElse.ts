/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @tsplus operator ets/Effect |
 * @tsplus fluent ets/Effect orElse
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E2, A | A2> {
  return self.tryOrElse(that, Effect.succeedNow)
}

/**
 * @tsplus static ets/Effect/Aspects orElse
 */
export const orElse = Pipeable(orElse_)
