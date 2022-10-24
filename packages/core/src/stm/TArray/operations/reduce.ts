import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduce
 * @tsplus pipeable effect/core/stm/TArray reduce
 * @category folding
 * @since 1.0.0
 */
export function reduce<A, Z>(zero: Z, f: (z: Z, a: A) => Z) {
  return (self: TArray<A>): STM<never, never, Z> =>
    STM.Effect((journal) => {
      let result = zero
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const value = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        result = f(result, value)
        i = i + 1
      }
      return result
    })
}
