import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * The first entry of the array, if it exists.
 *
 * @tsplus getter effect/core/stm/TArray firstMaybe
 * @category elements
 * @since 1.0.0
 */
export function firstMaybe<A>(self: TArray<A>): USTM<Option.Option<A>> {
  concreteTArray(self)
  return Chunk.isEmpty(self.chunk)
    ? STM.succeed(Option.none)
    : Chunk.unsafeHead(self.chunk).get.map(Option.some)
}
