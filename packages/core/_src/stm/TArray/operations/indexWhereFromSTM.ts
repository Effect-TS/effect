import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Starting at specified index, get the index of the next entry that matches a
 * transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhereFromSTM
 * @tsplus pipeable effect/core/stm/TArray indexWhereFromSTM
 */
export function indexWhereFromSTM<E, A>(
  f: (a: A) => STM<never, E, boolean>,
  from: number
) {
  return (self: TArray<A>): STM<never, E, number> => {
    if (from < 0) {
      return STM.succeedNow(-1)
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
    ? self.chunk
      .unsafeGet(index)!
      .get
      .flatMap(f)
      .flatMap((result) => result ? STM.succeedNow(index) : forIndex(self, index + 1, f))
    : STM.succeedNow(-1)
}
