import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduce
 * @tsplus pipeable effect/core/stm/TArray reduce
 */
export function reduce<A, Z>(zero: Z, f: (z: Z, a: A) => Z) {
  return (self: TArray<A>): STM<never, never, Z> =>
    STM.Effect((journal) => {
      let result = zero
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const value = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        result = f(result, value)
        i = i + 1
      }
      return result
    })
}
