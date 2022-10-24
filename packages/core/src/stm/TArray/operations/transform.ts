import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects transform
 * @tsplus pipeable effect/core/stm/TArray transform
 * @category mutations
 * @since 1.0.0
 */
export function transform<A>(f: (a: A) => A) {
  return (self: TArray<A>): STM<never, never, void> =>
    STM.Effect((journal) => {
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const current = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        pipe(self.chunk, Chunk.unsafeGet(i)).unsafeSet(f(current), journal)
        i = i + 1
      }
    })
}
