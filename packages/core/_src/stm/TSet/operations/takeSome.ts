import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus fluent ets/TSet takeSome
 */
export function takeSome_<A, B>(self: TSet<A>, pf: (a: A) => Maybe<B>): USTM<Chunk<B>> {
  concreteTSet(self)
  return self.tmap.takeSome((kv) => pf(kv.get(0)))
}

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static ets/TSet/Aspects takeSome
 */
export const takeSome = Pipeable(takeSome_)
