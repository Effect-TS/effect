import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Find the last element in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findLast
 * @tsplus pipeable effect/core/stm/TArray findLast
 */
export function findLast<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, Maybe<A>> =>
    STM.Effect((journal) => {
      concreteTArray(self)
      let i = self.chunk.length - 1
      let res = Maybe.empty<A>()
      while (res.isNone() && i >= 0) {
        const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        if (f(a)) {
          res = Maybe.some(a)
        }
        i = i - 1
      }
      return res
    })
}
