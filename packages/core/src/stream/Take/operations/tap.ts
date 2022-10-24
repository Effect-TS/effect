import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Returns an effect that effectfully "peeks" at the success of this take.
 *
 * @tsplus static effect/core/stream/Take.Aspects tap
 * @tsplus pipeable effect/core/stream/Take tap
 * @category sequencing
 * @since 1.0.0
 */
export function tap<A, R, E, E1, X>(
  f: (chunk: Chunk<A>) => Effect<R, E1, X>
) {
  return (self: Take<E, A>): Effect<R, E1, void> => {
    concreteTake(self)
    return self._exit.forEach(f).unit
  }
}
