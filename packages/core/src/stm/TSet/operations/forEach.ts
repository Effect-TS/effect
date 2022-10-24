import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically performs transactional-effect for each element in set.
 *
 * @tsplus static effect/core/stm/TSet.Aspects forEach
 * @tsplus pipeable effect/core/stm/TSet forEach
 * @category traversing
 * @since 1.0.0
 */
export function forEach<A, R, E>(f: (a: A) => STM<R, E, void>) {
  return (self: TSet<A>): STM<R, E, void> => {
    concreteTSet(self)
    return self.tmap.foldSTM(undefined as void, (_, kv) => f(kv[0]))
  }
}
