import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @tsplus static effect/core/stm/TArray.Aspects transformSTM
 * @tsplus pipeable effect/core/stm/TArray transformSTM
 * @category mutations
 * @since 1.0.0
 */
export function transformSTM<E, A>(f: (a: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, void> => {
    concreteTArray(self)
    return STM.forEach(self.chunk, (tref) => tref.get.flatMap(f)).flatMap((newData) =>
      STM.Effect((journal) => {
        for (let i = 0; i < newData.length; i++) {
          const value = pipe(newData, Chunk.unsafeGet(i))
          const entry = pipe(self.chunk, Chunk.unsafeGet(i))
          entry.unsafeSet(value, journal)
        }
      })
    )
  }
}
