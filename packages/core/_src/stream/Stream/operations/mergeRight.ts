import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the left stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeRight
 * @tsplus pipeable effect/core/stream/Stream mergeRight
 */
export function mergeRight<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.drain.merge(
      that,
      strategy
    )
}
