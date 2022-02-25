import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static ets/EffectOps reduce
 */
export function reduce<A, Z, R, E>(
  as: LazyArg<Iterable<A>>,
  z: LazyArg<Z>,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __tsplusTrace?: string
): Effect<R, E, Z> {
  return Effect.suspendSucceed(
    Iter.reduce_(as(), Effect.succeed(z) as Effect<R, E, Z>, (acc, el) =>
      acc.flatMap((a) => f(a, el))
    )
  )
}
