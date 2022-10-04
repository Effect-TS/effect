import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * retains bindings matching predicate and returns the retaind entries.
 *
 * @tsplus static effect/core/stm/TSet.Aspects retainIf
 * @tsplus pipeable effect/core/stm/TSet retainIf
 */
export function retainIf<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, Chunk<A>> => {
    concreteTSet(self)
    return self.tmap.retainIf((kv) => p(kv[0])).map((_) => _.map((kv) => kv[0]))
  }
}
