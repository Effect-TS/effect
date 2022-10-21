import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduceMaybe
 * @tsplus pipeable effect/core/stm/TArray reduceMaybe
 */
export function reduceMaybe<A>(f: (x: A, y: A) => A) {
  return (self: TArray<A>): STM<never, never, Maybe<A>> =>
    STM.Effect((journal) => {
      let i = 0
      let result: A | undefined = undefined
      concreteTArray(self)
      while (i < self.chunk.length) {
        const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        result = result == null ? a : f(a, result)
        i = i + 1
      }
      return Maybe.fromNullable(result)
    })
}
