import { IndexOutOfBoundsException } from "@effect/core/io/Cause"
import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Updates element in the array with given function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects update
 * @tsplus pipeable effect/core/stm/TArray update
 * @category mutations
 * @since 1.0.0
 */
export function update<A>(index: number, f: (a: A) => A) {
  return (self: TArray<A>): STM<never, never, void> => {
    concreteTArray(self)
    if (0 <= index && index < self.chunk.length) {
      return pipe(self.chunk, Chunk.unsafeGet(index)).update(f)
    } else {
      return STM.dieSync(new IndexOutOfBoundsException(index, 0, self.chunk.length))
    }
  }
}
