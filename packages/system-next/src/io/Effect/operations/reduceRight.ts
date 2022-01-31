import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @ets static ets/EffectOps reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __etsTrace?: string
): Effect<R, E, Z> {
  return Effect.suspendSucceed(() =>
    Iter.reduceRight_(i, Effect.succeedNow(zero) as Effect<R, E, Z>, (el, acc) =>
      acc.flatMap((a) => f(el, a))
    )
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
  __etsTrace?: string
) {
  return (i: Iterable<A>) => reduceRight_(i, zero, f)
}
