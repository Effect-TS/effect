/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @tsplus fluent ets/Effect zipLeft
 * @tsplus operator ets/Effect <
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A> {
  return self.flatMap((a) => that().as(a))
}

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @tsplus static ets/Effect/Aspects zipLeft
 */
export const zipLeft = Pipeable(zipLeft_)
