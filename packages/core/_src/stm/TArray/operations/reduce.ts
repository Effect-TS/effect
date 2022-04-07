import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Atomically folds using a pure function.
 *
 * @tsplus fluent ets/TArray reduce
 */
export function reduce_<A, Z>(self: TArray<A>, zero: Z, f: (z: Z, a: A) => Z): USTM<Z> {
  return STM.Effect((journal) => {
    let result = zero;
    let i = 0;
    concreteTArray(self);
    while (i < self.chunk.length) {
      const value = self.chunk.unsafeGet(i)!.unsafeGet(journal);
      result = f(result, value);
      i = i + 1;
    }
    return result;
  });
}

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static ets/TArray/Aspects reduce
 */
export const reduce = Pipeable(reduce_);
