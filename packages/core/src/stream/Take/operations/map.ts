import {
  concreteTake,
  TakeInternal
} from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.
 *
 * @tsplus static effect/core/stream/Take.Aspects map
 * @tsplus pipeable effect/core/stream/Take map
 * @category mapping
 * @since 1.0.0
 */
export function map<E, A, B>(f: (a: A) => B) {
  return (self: Take<E, A>): Take<E, B> => {
    concreteTake(self)
    return new TakeInternal(self._exit.map(Chunk.map(f)))
  }
}
