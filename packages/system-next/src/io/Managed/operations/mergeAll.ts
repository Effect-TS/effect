import * as Iter from "../../../collection/immutable/Iterable"
import { Managed } from "../definition"

/**
 * Merges an `Iterable<Managed<R, E, A>` to a single `Managed<R, E, B>`,
 * working sequentially.
 *
 * @ets static ets/ManagedOps mergeAll
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __etsTrace?: string
): Managed<R, E, B> {
  return Managed.suspend(
    Iter.reduce_(as, Managed.succeedNow(zero) as Managed<R, E, B>, (b, a) =>
      b.zipWith(a, f)
    )
  )
}

/**
 * Merges an `Iterable<Managed<R, E, A>` to a single `Managed<R, E, B>`,
 * working sequentially.
 *
 * @ets_data_first mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B, __etsTrace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAll_(as, zero, f)
}
