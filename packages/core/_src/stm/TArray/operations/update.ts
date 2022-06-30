import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Updates element in the array with given function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects update
 * @tsplus pipeable effect/core/stm/TArray update
 */
export function update<A>(index: number, f: (a: A) => A) {
  return (self: TArray<A>): STM<never, never, void> => {
    concreteTArray(self)
    if (0 <= index && index < self.chunk.length) {
      return self.chunk.unsafeGet(index)!.update(f)
    } else {
      return STM.die(new IndexOutOfBounds(index, 0, self.chunk.length))
    }
  }
}
