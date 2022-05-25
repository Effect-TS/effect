/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 *
 * @tsplus fluent ets/Stream interruptAfter
 */
export function interruptAfter_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.interruptWhen(Effect.sleep(duration))
}

/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 *
 * @tsplus static ets/Stream/Aspects interruptAfter
 */
export const interruptAfter = Pipeable(interruptAfter_)
