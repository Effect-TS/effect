import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Find the first element in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray find
 */
export function find_<A>(
  self: TArray<A>,
  p: Predicate<A>
): STM<unknown, never, Option<A>> {
  return STM.Effect((journal) => {
    let i = 0;
    concreteTArray(self);
    while (i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal);
      if (p(a)) {
        return Option.some(a);
      }
      i++;
    }
    return Option.none;
  });
}

/**
 * Find the first element in the array matching a predicate.
 *
 * @tsplus static ets/TArray/Aspects find
 */
export const find = Pipeable(find_);
