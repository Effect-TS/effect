import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus fluent ets/TSet fold
 */
export function fold_<A, B>(self: TSet<A>, zero: B, op: (acc: B, a: A) => B): USTM<B> {
  concreteTSet(self)
  return self.tmap.fold(zero, (acc, kv) => op(acc, kv.get(0)))
}

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static ets/TSet/Aspects fold
 */
export const fold = Pipeable(fold_)
