import { IndexOutOfBoundsException } from "@effect/core/io/Cause"
import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @tsplus static effect/core/stm/TArray.Aspects updateSTM
 * @tsplus pipeable effect/core/stm/TArray updateSTM
 * @category mutations
 * @since 1.0.0
 */
export function updateSTM<E, A>(index: number, f: (a: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, void> => {
    concreteTArray(self)
    if (0 <= index && index < self.chunk.length) {
      return Do(($) => {
        const currentVal = $(pipe(self.chunk, Chunk.unsafeGet(index)).get)
        const newVal = $(f(currentVal))
        return $(pipe(self.chunk, Chunk.unsafeGet(index)).set(newVal))
      })
    } else {
      return STM.dieSync(new IndexOutOfBoundsException(index, 0, self.chunk.length))
    }
  }
}
