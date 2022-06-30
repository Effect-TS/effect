import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Get the index of the first entry in the array, starting at a specific
 * index, matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhereFrom
 * @tsplus pipeable effect/core/stm/TArray indexWhereFrom
 */
export function indexWhereFrom<A>(f: Predicate<A>, from: number) {
  return (self: TArray<A>): STM<never, never, number> => {
    if (from < 0) {
      return STM.succeedNow(-1)
    }
    return STM.Effect((journal) => {
      let i = from
      let found = false
      concreteTArray(self)
      while (!found && i < self.chunk.length) {
        const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        found = f(a)
        i = i + 1
      }
      return found ? i - 1 : -1
    })
  }
}
