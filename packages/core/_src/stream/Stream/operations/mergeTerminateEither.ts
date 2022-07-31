import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when either stream terminates.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeTerminateEither
 * @tsplus pipeable effect/core/stream/Stream mergeTerminateEither
 */
export function mergeTerminateEither<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.merge(that, () => TerminationStrategy.Either)
}
