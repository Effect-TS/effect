import { concreteTArray } from "@effect-ts/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus fluent ets/TArray reduceOption
 */
export function reduceOption_<A>(
  self: TArray<A>,
  f: (x: A, y: A) => A
): USTM<Option<A>> {
  return STM.Effect((journal) => {
    let i = 0;
    let result: A | undefined = undefined;
    concreteTArray(self);
    while (i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal);
      result = result == null ? a : f(a, result);
      i = i + 1;
    }
    return Option.fromNullable(result);
  });
}

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus static ets/TArray/Aspects reduceOption
 */
export const reduceOption = Pipeable(reduceOption_);
