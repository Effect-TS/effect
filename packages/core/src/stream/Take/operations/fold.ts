import type { Chunk } from "../../../collection/immutable/Chunk"
import { Cause } from "../../../io/Cause"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @tsplus fluent ets/Take fold
 */
export function fold_<E, A, Z>(
  self: Take<E, A>,
  end: Z,
  error: (cause: Cause<E>) => Z,
  value: (chunk: Chunk<A>) => Z,
  __tsplusTrace?: string
): Z {
  concreteTake(self)
  return self._exit.fold(
    (cause) => Cause.flipCauseOption(cause).fold(() => end, error),
    value
  )
}

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 */
export const fold = Pipeable(fold_)
