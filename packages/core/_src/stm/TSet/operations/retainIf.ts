import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * retains bindings matching predicate and returns the retaind entries.
 *
 * @tsplus fluent ets/TSet retainIf
 */
export function retainIf_<A>(self: TSet<A>, p: (a: A) => boolean): USTM<Chunk<A>> {
  concreteTSet(self)
  return self.tmap.retainIf((kv) => p(kv.get(0))).map((_) => _.map((kv) => kv.get(0)))
}

/**
 * retains bindings matching predicate and returns the retaind entries.
 *
 * @tsplus static ets/TSet/Aspects retainIf
 */
export const retainIf = Pipeable(retainIf_)
