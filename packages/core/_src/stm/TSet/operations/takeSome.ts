import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeSome
 * @tsplus pipeable effect/core/stm/TSet takeSome
 */
export function takeSome<A, B>(pf: (a: A) => Maybe<B>) {
  return (self: TSet<A>): STM<never, never, Chunk<B>> => {
    concreteTSet(self)
    return self.tmap.takeSome((kv) => pf(kv.get(0)))
  }
}
