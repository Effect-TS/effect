import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically updates all elements using a pure function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects transform
 * @tsplus pipeable effect/core/stm/TArray transform
 */
export function transform<A>(f: (a: A) => A) {
  return (self: TArray<A>): STM<never, never, void> =>
    STM.Effect((journal) => {
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const current = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        self.chunk.unsafeGet(i)!.unsafeSet(f(current), journal)
        i = i + 1
      }
    })
}
