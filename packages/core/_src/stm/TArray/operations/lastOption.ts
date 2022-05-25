import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * The last entry in the array, if it exists.
 *
 * @tsplus getter ets/TArray lastOption
 */
export function lastOption<A>(self: TArray<A>): USTM<Option<A>> {
  concreteTArray(self)
  return self.chunk.isEmpty()
    ? STM.succeedNow(Option.none)
    : self.chunk.unsafeLast()!.get().map(Option.some)
}
