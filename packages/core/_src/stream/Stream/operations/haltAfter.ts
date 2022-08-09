/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @tsplus static effect/core/stream/Stream.Aspects haltAfter
 * @tsplus pipeable effect/core/stream/Stream haltAfter
 */
export function haltAfter(duration: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => self.haltWhen(Effect.sleep(duration))
}
