import * as Iter from "../../../collection/immutable/Iterable"
import { Managed } from "../definition"

/**
 * Reduces an `Iterable<Managed<R, E ,A>>` to a single `Managed<R, E, A>`,
 * working sequentially.
 *
 * @ets static ets/ManagedOps reduceAll
 */
export function reduceAll_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  init: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.suspend(Iter.reduce_(as, init, (acc, a) => acc.zipWith(a, f)))
}

/**
 * Reduces an `Iterable<Managed<R, E ,A>>` to a single `Managed<R, E, A>`,
 * working sequentially.
 *
 * @ets_data_first reduceAll_
 */
export function reduceAll<R, E, A>(
  init: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
) {
  return (as: Iterable<Managed<R, E, A>>): Managed<R, E, A> => reduceAll_(as, init, f)
}
