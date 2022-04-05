import { concreteTArray } from "@effect-ts/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * The first entry of the array, if it exists.
 *
 * @tsplus getter ets/TArray firstOption
 */
export function firstOption<A>(self: TArray<A>): USTM<Option<A>> {
  concreteTArray(self);
  return self.chunk.isEmpty()
    ? STM.succeedNow(Option.none)
    : self.chunk.unsafeHead()!.get().map(Option.some);
}
