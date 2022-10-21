import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus static effect/core/stm/TSet.Aspects removeIf
 * @tsplus pipeable effect/core/stm/TSet removeIf
 */
export function removeIf<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, Chunk<A>> => {
    concreteTSet(self)
    return self.tmap.removeIf((kv) => p(kv[0])).map((_) => _.map((kv) => kv[0]))
  }
}
