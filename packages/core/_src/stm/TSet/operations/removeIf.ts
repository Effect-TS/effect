import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus fluent ets/TSet removeIf
 */
export function removeIf_<A>(self: TSet<A>, p: (a: A) => boolean): USTM<Chunk<A>> {
  concreteTSet(self)
  return self.tmap.removeIf((kv) => p(kv.get(0))).map((_) => _.map((kv) => kv.get(0)))
}

/**
 * Removes bindings matching predicate and returns the removed entries.
 *
 * @tsplus static ets/TSet/Aspects removeIf
 */
export const removeIf = Pipeable(removeIf_)
