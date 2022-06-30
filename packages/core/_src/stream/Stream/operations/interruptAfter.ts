/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects interruptAfter
 * @tsplus pipeable effect/core/stream/Stream interruptAfter
 */
export function interruptAfter(
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => self.interruptWhen(Effect.sleep(duration))
}
