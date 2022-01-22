import * as Iter from "../../Iterable"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @ets static ets/EffectOps reduce
 */
export function reduce_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __trace?: string
): Effect<R, E, Z> {
  return suspendSucceed(
    () =>
      Iter.reduce_(i, succeedNow(zero) as Effect<R, E, Z>, (acc, el) =>
        chain_(acc, (a) => f(a, el))
      ),
    __trace
  )
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduce_
 */
export function reduce<Z, R, E, A>(
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __trace?: string
) {
  return (i: Iterable<A>) => reduce_(i, zero, f, __trace)
}
