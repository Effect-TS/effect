import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy";

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when either stream terminates.
 *
 * @tsplus fluent ets/Stream mergeTerminateEither
 */
export function mergeTerminateEither_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A | A2> {
  return self.merge(that, () => TerminationStrategy.Either);
}

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when either stream terminates.
 *
 * @tsplus static ets/Stream/Aspects mergeTerminateEither
 */
export const mergeTerminateEither = Pipeable(mergeTerminateEither_);
