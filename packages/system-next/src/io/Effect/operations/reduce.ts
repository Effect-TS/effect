import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static ets/EffectOps reduce
 */
export function reduce_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __etsTrace?: string
): Effect<R, E, Z> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(i, Effect.succeedNow(zero) as Effect<R, E, Z>, (acc, el) =>
      acc.flatMap((a) => f(a, el))
    )
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
  __etsTrace?: string
) {
  return (i: Iterable<A>) => reduce_(i, zero, f)
}
