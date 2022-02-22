import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static ets/EffectOps reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  as: LazyArg<Iterable<A>>,
  z: LazyArg<Z>,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __etsTrace?: string
): Effect<R, E, Z> {
  return Effect.suspendSucceed(
    Iter.reduceRight_(as(), Effect.succeed(z) as Effect<R, E, Z>, (el, acc) =>
      acc.flatMap((a) => f(el, a))
    )
  )
}
