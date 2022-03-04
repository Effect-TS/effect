import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Reduces an `Iterable<STM<R, E, A>>` to a single `STM<R, E, A>`, working
 * sequentially.
 *
 * @tsplus static ets/STMOps reduceAll
 */
export function reduceAll<R, E, A>(
  a: LazyArg<STM<R, E, A>>,
  as: LazyArg<Iterable<STM<R, E, A>>>,
  f: (acc: A, a: A) => A
): STM<R, E, A> {
  return STM.suspend(Iter.reduce_(as(), a(), (acc, a) => acc.zipWith(a, f)))
}
