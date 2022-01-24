import * as Iter from "../../../collection/immutable/Iterable"
import type { Managed } from "../definition"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"
import { zipWith_ } from "./zipWith"

/**
 * Merges an `Iterable<Managed<R, E, A>` to a single `Managed<R, E, B>`,
 * working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
): Managed<R, E, B> {
  return suspend(
    () =>
      Iter.reduce_(as, succeedNow(zero) as Managed<R, E, B>, (b, a) =>
        zipWith_(b, a, f)
      ),
    __trace
  )
}

/**
 * Merges an `Iterable<Managed<R, E, A>` to a single `Managed<R, E, B>`,
 * working sequentially.
 *
 * @ets_data_first mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAll_(as, zero, f, __trace)
}
