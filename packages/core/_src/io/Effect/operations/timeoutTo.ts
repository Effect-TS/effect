/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @tsplus fluent ets/Effect timeoutTo
 */
export function timeoutTo_<R, E, A, B, B1>(
  self: Effect<R, E, A>,
  def: LazyArg<B1>,
  f: (a: A) => B,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<R & HasClock, E, B | B1> {
  return self.map(f).raceFirst(
    Effect.sleep(duration)
      .interruptible()
      .map(() => def())
  );
}

/**
 * Returns an effect that will timeout this effect, returning either the
 * default value if the timeout elapses before the effect has produced a
 * value or returning the result of applying the function `f` to the
 * success value of the effect.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * @tsplus static ets/Effect/Aspects timeoutTo
 */
export const timeoutTo = Pipeable(timeoutTo_);
