/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects timeoutTo
 * @tsplus pipeable effect/core/io/Effect timeoutTo
 */
export function timeoutTo<A, B, B1>(
  def: LazyArg<B1>,
  f: (a: A) => B,
  duration: LazyArg<Duration>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, B | B1> =>
    self.map(f).raceFirst(
      Effect.sleep(duration)
        .interruptible
        .map(def)
    )
}
