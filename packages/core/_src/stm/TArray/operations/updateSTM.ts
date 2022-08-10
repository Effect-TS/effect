import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically updates element in the array with given transactional effect.
 *
 * @tsplus static effect/core/stm/TArray.Aspects updateSTM
 * @tsplus pipeable effect/core/stm/TArray updateSTM
 */
export function updateSTM<E, A>(index: number, f: (a: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, void> => {
    concreteTArray(self)
    if (0 <= index && index < self.chunk.length) {
      return Do(($) => {
        const currentVal = $(self.chunk.unsafeGet(index)!.get)
        const newVal = $(f(currentVal))
        return $(self.chunk.unsafeGet(index)!.set(newVal))
      })
    } else {
      return STM.dieSync(new IndexOutOfBounds(index, 0, self.chunk.length))
    }
  }
}
