import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * retains elements matching predicate.
 *
 * @tsplus fluent ets/TSet retainIfDiscard
 */
export function retainIfDiscard_<A>(self: TSet<A>, p: (a: A) => boolean): USTM<void> {
  concreteTSet(self)
  return self.tmap.retainIfDiscard((kv) => p(kv.get(0)))
}

/**
 * retains elements matching predicate.
 *
 * @tsplus static ets/TSet/Aspects retainIfDiscard
 */
export const retainIfDiscard = Pipeable(retainIfDiscard_)
