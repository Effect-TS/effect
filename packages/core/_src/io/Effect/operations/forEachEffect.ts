/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @tsplus fluent ets/Effect forEachEffect
 */
export function forEachEffect_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Effect<R | R1, E1, Maybe<B>> {
  return self.foldCauseEffect(
    () => Effect.none,
    (a) => f(a).map(Maybe.some)
  )
}

/**
 * Returns a new effect that will pass the success value of this effect to the
 * provided callback. If this effect fails, then the failure will be ignored.
 *
 * @tsplus static ets/Effect/Aspects forEachEffect
 */
export const forEachEffect = Pipeable(forEachEffect_)
