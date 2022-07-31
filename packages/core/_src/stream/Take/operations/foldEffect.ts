import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Effectful version of `Take.fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 *
 * @tsplus static effect/core/stream/Take.Aspects foldEffect
 * @tsplus pipeable effect/core/stream/Take foldEffect
 */
export function foldEffect<R, E1, Z, E, R1, E2, A, R2, E3>(
  end: Effect<R, E1, Z>,
  error: (cause: Cause<E>) => Effect<R1, E2, Z>,
  value: (chunk: Chunk<A>) => Effect<R2, E3, Z>
) {
  return (self: Take<E, A>): Effect<R | R1 | R2, E1 | E2 | E3, Z> => {
    concreteTake(self)
    return self._exit.foldEffect(
      (cause): Effect<R | R1, E1 | E2, Z> => Cause.flipCauseMaybe(cause).fold(() => end, error),
      value
    )
  }
}
