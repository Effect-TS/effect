import * as Iter from "../../Iterable"
import type { Effect } from "../definition"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"
import { zipWith_ } from "./zipWith"

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
 * sequentially.
 *
 * @ets static ets/EffectOps mergeAll
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
): Effect<R, E, B> {
  return suspendSucceed(
    () =>
      Iter.reduce_(as, succeedNow(zero) as Effect<R, E, B>, (acc, a) =>
        zipWith_(acc, a, f)
      ),
    __trace
  )
}

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
 * sequentially.
 *
 * @ets_data_first mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAll_(as, zero, f, __trace)
}
