import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Starting at specified index, get the index of the next entry that matches a
 * transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhereFromSTM
 * @tsplus pipeable effect/core/stm/TArray indexWhereFromSTM
 * @category elements
 * @since 1.0.0
 */
export function indexWhereFromSTM<E, A>(
  f: (a: A) => STM<never, E, boolean>,
  from: number
) {
  return (self: TArray<A>): STM<never, E, number> => {
    if (from < 0) {
      return STM.succeed(-1)
    }
    return forIndex(self, from, f)
  }
}

function forIndex<E, A>(
  self: TArray<A>,
  index: number,
  f: (a: A) => STM<never, E, boolean>
): STM<never, E, number> {
  concreteTArray(self)
  return index < self.chunk.length
    ? pipe(self.chunk, Chunk.unsafeGet(index))
      .get
      .flatMap(f)
      .flatMap((result) => result ? STM.succeed(index) : forIndex(self, index + 1, f))
    : STM.succeed(-1)
}
