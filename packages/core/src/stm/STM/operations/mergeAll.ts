import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Merges an `Iterable<STM<R, E, A>>` to a single `STM<R, E, B>`, working
 * sequentially.
 *
 * @tsplus static ets/STMOps mergeAll
 */
export function mergeAll<R, E, A, B>(
  as: LazyArg<Iterable<STM<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B
): STM<R, E, B> {
  return STM.suspend(() =>
    Iter.reduce_(as(), STM.succeed(zero) as STM<R, E, B>, (acc, a) => acc.zipWith(a, f))
  )
}
