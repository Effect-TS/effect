import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus static effect/core/stm/TSet.Aspects removeIf
 * @tsplus pipeable effect/core/stm/TSet removeIf
 * @category mutations
 * @since 1.0.0
 */
export function removeIf<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, Chunk.Chunk<A>> => {
    concreteTSet(self)
    return self.tmap.removeIf((kv) => p(kv[0])).map(Chunk.map((kv) => kv[0]))
  }
}
