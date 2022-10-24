import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TSet.Aspects takeSome
 * @tsplus pipeable effect/core/stm/TSet takeSome
 * @category mutations
 * @since 1.0.0
 */
export function takeSome<A, B>(pf: (a: A) => Option<B>) {
  return (self: TSet<A>): STM<never, never, Chunk<B>> => {
    concreteTSet(self)
    return self.tmap.takeSome((kv) => pf(kv[0]))
  }
}
