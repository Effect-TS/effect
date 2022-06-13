import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically folds using a transactional function.
 *
 * @tsplus fluent ets/TSet foldSTM
 */
export function foldSTM_<A, B, R, E>(self: TSet<A>, zero: B, op: (acc: B, a: A) => STM<R, E, B>): STM<R, E, B> {
  concreteTSet(self)
  return self.tmap.foldSTM(zero, (acc, kv) => op(acc, kv.get(0)))
}

/**
 * Atomically folds using a transactional function.
 *
 * @tsplus static ets/TSet/Aspects foldSTM
 */
export const foldSTM = Pipeable(foldSTM_)
