import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Merges an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
 * sequentially.
 *
 * @tsplus static ets/EffectOps mergeAll
 */
export function mergeAll<R, E, A, B>(
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(as(), Effect.succeed(zero) as Effect<R, E, B>, (acc, a) =>
      acc.zipWith(a, f)
    )
  )
}
