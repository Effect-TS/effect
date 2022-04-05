import { concreteTArray } from "@effect-ts/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Updates element in the array with given function.
 *
 * @tsplus fluent ets/TArray update
 */
export function update_<A>(self: TArray<A>, index: number, f: (a: A) => A): USTM<void> {
  concreteTArray(self);
  if (0 <= index && index < self.chunk.length) {
    return self.chunk.unsafeGet(index)!.update(f);
  } else {
    return STM.die(new IndexOutOfBounds(index, 0, self.chunk.length));
  }
}

/**
 * Updates element in the array with given function.
 *
 * @tsplus static ets/TArray/Aspects update
 */
export const update = Pipeable(update_);
