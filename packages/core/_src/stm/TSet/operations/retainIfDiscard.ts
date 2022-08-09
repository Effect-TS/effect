import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Retains elements matching predicate.
 *
 * @tsplus static effect/core/stm/TSet.Aspects retainIfDiscard
 * @tsplus pipeable effect/core/stm/TSet retainIfDiscard
 */
export function retainIfDiscard<A>(p: Predicate<A>) {
  return (self: TSet<A>): STM<never, never, void> => {
    concreteTSet(self)
    return self.tmap.retainIfDiscard((kv) => p(kv.get(0)))
  }
}
