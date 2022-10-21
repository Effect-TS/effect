import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when the specified stream terminates.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeTerminateRight
 * @tsplus pipeable effect/core/stream/Stream mergeTerminateRight
 */
export function mergeTerminateRight<R2, E2, A2>(that: Stream<R2, E2, A2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.merge(that, TerminationStrategy.Right)
}
