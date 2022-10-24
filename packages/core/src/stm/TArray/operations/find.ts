import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Find the first element in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects find
 * @tsplus pipeable effect/core/stm/TArray find
 * @category elements
 * @since 1.0.0
 */
export function find<A>(p: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, Option.Option<A>> =>
    STM.Effect((journal) => {
      let i = 0
      concreteTArray(self)
      while (i < self.chunk.length) {
        const a = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        if (p(a)) {
          return Option.some(a)
        }
        i++
      }
      return Option.none
    })
}
