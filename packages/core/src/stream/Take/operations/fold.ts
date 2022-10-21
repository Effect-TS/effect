import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @tsplus static effect/core/stream/Take.Aspects fold
 * @tsplus pipeable effect/core/stream/Take fold
 */
export function fold<E, A, Z>(
  end: Z,
  error: (cause: Cause<E>) => Z,
  value: (chunk: Chunk<A>) => Z
) {
  return (self: Take<E, A>): Z => {
    concreteTake(self)
    return self._exit.fold(
      (cause) => Cause.flipCauseMaybe(cause).fold(() => end, error),
      value
    )
  }
}
