import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically updates all elements using a transactional effect.
 *
 * @tsplus static effect/core/stm/TArray.Aspects transformSTM
 * @tsplus pipeable effect/core/stm/TArray transformSTM
 */
export function transformSTM<E, A>(f: (a: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, void> => {
    concreteTArray(self)
    return STM.forEach(self.chunk, (tref) => tref.get.flatMap(f)).flatMap((newData) =>
      STM.Effect((journal) => {
        for (let i = 0; i < newData.length; i++) {
          const value = newData.unsafeGet(i)!
          const entry = self.chunk.unsafeGet(i)!
          entry.unsafeSet(value, journal)
        }
      })
    )
  }
}
