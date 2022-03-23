import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../definition"
import { TerminationStrategy } from "../TerminationStrategy"

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when this stream terminates.
 *
 * @tsplus fluent ets/Stream mergeTerminateLeft
 */
export function mergeTerminateLeft_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A | A2> {
  return self.merge(that, () => TerminationStrategy.Left)
}

/**
 * Merges this stream and the specified stream together. New produced stream
 * will terminate when this stream terminates.
 */
export const mergeTerminateLeft = Pipeable(mergeTerminateLeft_)
