import * as Iter from "../../../collection/immutable/Iterable"
import type { Managed } from "../definition"
import { suspend } from "./suspend"
import { zipWith_ } from "./zipWith"

/**
 * Reduces an `Iterable<Managed<R, E ,A>>` to a single `Managed<R, E, A>`,
 * working sequentially.
 */
export function reduceAll_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  init: Managed<R, E, A>,
  f: (acc: A, a: A) => A,
  __trace?: string
): Managed<R, E, A> {
  return suspend(() => Iter.reduce_(as, init, (acc, a) => zipWith_(acc, a, f)), __trace)
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
  __trace?: string
) {
  return (as: Iterable<Managed<R, E, A>>): Managed<R, E, A> =>
    reduceAll_(as, init, f, __trace)
}
