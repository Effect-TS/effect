import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus fluent ets/TArray reduceMaybe
 */
export function reduceMaybe_<A>(
  self: TArray<A>,
  f: (x: A, y: A) => A
): USTM<Maybe<A>> {
  return STM.Effect((journal) => {
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

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus static ets/TArray/Aspects reduceMaybe
 */
export const reduceMaybe = Pipeable(reduceMaybe_)
