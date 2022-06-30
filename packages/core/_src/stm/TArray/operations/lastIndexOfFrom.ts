import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects lastIndexOfFrom
 * @tsplus pipeable effect/core/stm/TArray lastIndexOfFrom
 */
export function lastIndexOfFrom<A>(equivalence: Equivalence<A>, value: A, end: number) {
  return (self: TArray<A>): USTM<number> => {
    concreteTArray(self)
    if (end >= self.chunk.length) {
      return STM.succeedNow(-1)
    }
    return STM.Effect((journal) => {
      let i = end
      let found = false
      while (!found && i >= 0) {
        const element = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        found = equivalence.equals(element, value)
        i = i - 1
      }
      return found ? i + 1 : -1
    })
  }
}
