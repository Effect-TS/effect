import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Find the last element in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects findLast
 * @tsplus pipeable effect/core/stm/TArray findLast
 * @category elements
 * @since 1.0.0
 */
export function findLast<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, Option.Option<A>> =>
    STM.Effect((journal) => {
      concreteTArray(self)
      let i = self.chunk.length - 1
      let res: Option.Option<A> = Option.none
      while (Option.isNone(res) && i >= 0) {
        const a = pipe(self.chunk, Chunk.unsafeGet(i)).unsafeGet(journal)
        if (f(a)) {
          res = Option.some(a)
        }
        i = i - 1
      }
      return res
    })
}
