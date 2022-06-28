import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * The last entry in the array, if it exists.
 *
 * @tsplus getter effect/core/stm/TArray lastMaybe
 */
export function lastMaybe<A>(self: TArray<A>): USTM<Maybe<A>> {
  concreteTArray(self)
  return self.chunk.isEmpty
    ? STM.succeedNow(Maybe.none)
    : self.chunk.unsafeLast!.get.map(Maybe.some)
}
