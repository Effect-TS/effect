import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"

/**
 * The first entry of the array, if it exists.
 *
 * @tsplus getter effect/core/stm/TArray firstMaybe
 */
export function firstMaybe<A>(self: TArray<A>): USTM<Maybe<A>> {
  concreteTArray(self)
  return self.chunk.isEmpty
    ? STM.succeed(Maybe.none)
    : self.chunk.unsafeHead!.get.map(Maybe.some)
}
