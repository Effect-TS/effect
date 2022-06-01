import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the left stream.
 *
 * @tsplus fluent ets/Stream mergeRight
 */
export function mergeRight_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A2> {
  return self.drain().merge(that, strategy)
}

/**
 * Merges this stream and the specified stream together, discarding the values
 * from the left stream.
 *
 * @tsplus static ets/Stream/Aspects mergeRight
 */
export const mergeRight = Pipeable(mergeRight_)
