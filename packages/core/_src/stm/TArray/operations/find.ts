import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Find the first element in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects find
 * @tsplus pipeable effect/core/stm/TArray find
 */
export function find<A>(p: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, Maybe<A>> =>
    STM.Effect((journal) => {
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        if (p(a)) {
          return Maybe.some(a)
        }
        i++
      }
      return Maybe.none
    })
}
