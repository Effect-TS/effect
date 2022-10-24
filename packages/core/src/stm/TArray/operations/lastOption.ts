import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * The last entry in the array, if it exists.
 *
 * @tsplus getter effect/core/stm/TArray lastOption
 */
export function lastOption<A>(self: TArray<A>): USTM<Option.Option<A>> {
  concreteTArray(self)
  return Chunk.isEmpty(self.chunk)
    ? STM.succeed(Option.none)
    : pipe(self.chunk, Chunk.unsafeLast).get.map(Option.some)
}
