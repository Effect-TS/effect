import * as Iter from "../../Iterable"
import type { Effect } from "../definition"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"
import { zipWith_ } from "./zipWith"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @ets static ets/EffectOps filter
 */
export function filter_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
): Effect<R, E, readonly A[]> {
  return suspendSucceed(
    () =>
      Iter.reduce_(as, <Effect<R, E, A[]>>succeed(() => []), (io, a) =>
        zipWith_(
          io,
          suspendSucceed(() => f(a)),
          (as_, p) => {
            if (p) {
              as_.push(a)
            }
            return as_
          }
        )
      ),
    __trace
  )
}

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @ets_data_first filter_
 */
export function filter<A, R, E>(f: (a: A) => Effect<R, E, boolean>, __trace?: string) {
  return (as: Iterable<A>) => filter_(as, f, __trace)
}
