import * as Iter from "../../../collection/immutable/Iterable"
import type { Effect } from "../definition"
import { suspendSucceed } from "./suspendSucceed"
import { zipWith_ } from "./zipWith"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * sequentially.
 *
 * @ets static ets/EffectOps reduceAll
 */
export function reduceAll_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  a: Effect<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
): Effect<R, E, A> {
  return suspendSucceed(
    () => Iter.reduce_(as, a, (acc, a) => zipWith_(acc, a, f)),
    __etsTrace
  )
}

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * sequentially.
 *
 * @ets_data_first reduceAll_
 */
export function reduceAll<R, E, A>(
  a: Effect<R, E, A>,
  f: (acc: A, a: A) => A,
  __etsTrace?: string
) {
  return (as: Iterable<Effect<R, E, A>>) => reduceAll_(as, a, f, __etsTrace)
}
