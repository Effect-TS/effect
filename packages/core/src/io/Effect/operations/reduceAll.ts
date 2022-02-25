import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Reduces an `Iterable<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * sequentially.
 *
 * @tsplus static ets/EffectOps reduceAll
 */
export function reduceAll<R, E, A>(
  a: LazyArg<Effect<R, E, A>>,
  as: LazyArg<Iterable<Effect<R, E, A>>>,
  f: (acc: A, a: A) => A,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(Iter.reduce_(as(), a(), (acc, a) => acc.zipWith(a, f)))
}
