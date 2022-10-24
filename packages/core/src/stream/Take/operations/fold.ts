import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 *
 * @tsplus static effect/core/stream/Take.Aspects fold
 * @tsplus pipeable effect/core/stream/Take fold
 * @category folding
 * @since 1.0.0
 */
export function fold<E, A, Z>(
  end: Z,
  error: (cause: Cause<E>) => Z,
  value: (chunk: Chunk<A>) => Z
) {
  return (self: Take<E, A>): Z => {
    concreteTake(self)
    return self._exit.fold(
      (cause) => {
        const option = Cause.flipCauseOption(cause)
        switch (option._tag) {
          case "None": {
            return end
          }
          case "Some": {
            return error(option.value)
          }
        }
      },
      value
    )
  }
}
