import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically folds using a transactional function.
 *
 * @tsplus static effect/core/stm/TSet.Aspects foldSTM
 * @tsplus pipeable effect/core/stm/TSet foldSTM
 */
export function foldSTM<B, A, R, E>(zero: B, op: (acc: B, a: A) => STM<R, E, B>) {
  return (self: TSet<A>): STM<R, E, B> => {
    concreteTSet(self)
    return self.tmap.foldSTM(zero, (acc, kv) => op(acc, kv[0]))
  }
}
