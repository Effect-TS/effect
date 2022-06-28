import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the right stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeLeft
 * @tsplus pipeable effect/core/stream/Stream mergeLeft
 */
export function mergeLeft<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.merge(
      that().drain,
      strategy
    )
}
