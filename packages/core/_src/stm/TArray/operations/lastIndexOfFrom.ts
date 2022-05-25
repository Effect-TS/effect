import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus fluent ets/TArray lastIndexOfFrom
 */
export function lastIndexOfFrom_<A>(self: TArray<A>, equivalence: Equivalence<A>) {
  return (a: A, end: number): USTM<number> => {
    concreteTArray(self)
    if (end >= self.chunk.length) {
      return STM.succeedNow(-1)
    }
    return STM.Effect((journal) => {
      let i = end
      let found = false
      while (!found && i >= 0) {
        const value = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        found = equivalence.equals(value, a)
        i = i - 1
      }
      return found ? i + 1 : -1
    })
  }
}

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static ets/TArray/Aspects lastIndexOfFrom
 */
export const lastIndexOfFrom = Pipeable(lastIndexOfFrom_)
