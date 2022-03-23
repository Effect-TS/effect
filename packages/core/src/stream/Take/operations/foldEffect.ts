import type { Chunk } from "../../../collection/immutable/Chunk"
import { Cause } from "../../../io/Cause"
import type { Effect } from "../../../io/Effect"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Effectful version of `Take.fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 *
 * @tsplus fluent ets/Take foldEffect
 */
export function foldEffect_<R, R1, R2, E, E1, E2, E3, A, Z>(
  self: Take<E, A>,
  end: Effect<R, E1, Z>,
  error: (cause: Cause<E>) => Effect<R1, E2, Z>,
  value: (chunk: Chunk<A>) => Effect<R2, E3, Z>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E1 | E2 | E3, Z> {
  concreteTake(self)
  return self._exit.foldEffect(
    (cause): Effect<R & R1, E1 | E2, Z> =>
      Cause.flipCauseOption(cause).fold(() => end, error),
    value
  )
}

/**
 * Effectful version of `Take.fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 */
export const foldEffect = Pipeable(foldEffect_)
