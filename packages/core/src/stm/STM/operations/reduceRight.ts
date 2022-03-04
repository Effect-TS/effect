import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.
 *
 * @tsplus static ets/STMOps reduceRight
 */
export function reduceRight_<A, Z, R, E>(
  as: LazyArg<Iterable<A>>,
  z: LazyArg<Z>,
  f: (a: A, z: Z) => STM<R, E, Z>,
  __tsplusTrace?: string
): STM<R, E, Z> {
  return STM.suspend(
    Iter.reduceRight_(as(), STM.succeed(z) as STM<R, E, Z>, (el, acc) =>
      acc.flatMap((a) => f(el, a))
    )
  )
}
