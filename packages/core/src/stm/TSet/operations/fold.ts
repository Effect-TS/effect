import { concreteTSet } from "@effect/core/stm/TSet/operations/_internal/InternalTSet"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus static effect/core/stm/TSet.Aspects fold
 * @tsplus pipeable effect/core/stm/TSet fold
 * @category folding
 * @since 1.0.0
 */
export function fold<A, B>(zero: B, op: (acc: B, a: A) => B) {
  return (self: TSet<A>): STM<never, never, B> => {
    concreteTSet(self)
    return self.tmap.fold(zero, (acc, kv) => op(acc, kv[0]))
  }
}
