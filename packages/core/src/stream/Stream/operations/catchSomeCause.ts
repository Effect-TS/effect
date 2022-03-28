import type { Option } from "../../../data/Option"
import type { Cause } from "../../../io/Cause"
import { Stream } from "../definition"

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some errors. Allows recovery from all causes of failure,
 * including interruption if the stream is uninterruptible.
 *
 * @tsplus fluent ets/Stream catchSomeCause
 */
export function catchSomeCause_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (cause: Cause<E>) => Option<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A | A2> {
  return self.catchAllCause(
    (cause): Stream<R2, E | E2, A2> => pf(cause).getOrElse(Stream.failCause(cause))
  )
}

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some errors. Allows recovery from all causes of failure,
 * including interruption if the stream is uninterruptible.
 */
export const catchSomeCause = Pipeable(catchSomeCause_)
