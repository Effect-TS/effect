import type { Duration } from "@fp-ts/data/Duration"

/**
 * Specialized version of interruptWhen which interrupts the evaluation of
 * this stream after the given duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects interruptAfter
 * @tsplus pipeable effect/core/stream/Stream interruptAfter
 * @category mutations
 * @since 1.0.0
 */
export function interruptAfter(duration: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> =>
    self.interruptWhen(Effect.sleep(duration))
}
