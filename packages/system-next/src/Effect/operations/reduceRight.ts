import * as Iter from "../../Iterable"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @ets static ets/EffectOps reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __trace?: string
): Effect<R, E, Z> {
  return suspendSucceed(
    () =>
      Iter.reduceRight_(i, succeedNow(zero) as Effect<R, E, Z>, (el, acc) =>
        chain_(acc, (a) => f(el, a))
      ),
    __trace
  )
}

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduceRight_
 */
export function reduceRight<R, E, A, Z>(
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __trace?: string
) {
  return (i: Iterable<A>) => reduceRight_(i, zero, f, __trace)
}
