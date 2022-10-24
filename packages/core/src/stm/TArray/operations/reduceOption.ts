import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduceOption
 * @tsplus pipeable effect/core/stm/TArray reduceOption
 * @category folding
 * @since 1.0.0
 */
export function reduceOption<A>(f: (x: A, y: A) => A) {
  return (self: TArray<A>): STM<never, never, Option.Option<A>> =>
    STM.Effect((journal) => {
      let i = 0
      let result: A | undefined = undefined
      concreteTArray(self)
      while (i < self.chunk.length) {
        const a = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        result = result == null ? a : f(a, result)
        i = i + 1
      }
      return Option.fromNullable(result)
    })
}
