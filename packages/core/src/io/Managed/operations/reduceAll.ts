import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Reduces an `Iterable<Managed<R, E ,A>>` to a single `Managed<R, E, A>`,
 * working sequentially.
 *
 * @tsplus static ets/ManagedOps reduceAll
 */
export function reduceAll<R, E, A>(
  init: LazyArg<Managed<R, E, A>>,
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.suspend(Iter.reduce_(as(), init(), (acc, a) => acc.zipWith(a, f)))
}
