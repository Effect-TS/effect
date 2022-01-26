import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../definition"

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
  __etsTrace?: string
): Effect<R, E, B> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(as, Effect.succeedNow(zero) as Effect<R, E, B>, (acc, a) =>
      acc.zipWith(a, f)
    )
  )
}

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
 * sequentially.
 *
 * @ets_data_first mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B, __etsTrace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAll_(as, zero, f)
}
