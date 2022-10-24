import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects lastIndexOfFrom
 * @tsplus pipeable effect/core/stm/TArray lastIndexOfFrom
 * @category elements
 * @since 1.0.0
 */
export function lastIndexOfFrom<A>(value: A, end: number) {
  return (self: TArray<A>): USTM<number> => {
    concreteTArray(self)
    if (end >= self.chunk.length) {
      return STM.succeed(-1)
    }
    return STM.Effect((journal) => {
      let i = end
      let found = false
      while (!found && i >= 0) {
        const element = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        found = Equal.equals(element, value)
        i = i - 1
      }
      return found ? i + 1 : -1
    })
  }
}
